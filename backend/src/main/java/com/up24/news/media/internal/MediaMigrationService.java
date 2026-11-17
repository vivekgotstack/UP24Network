package com.up24.news.media.internal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.jobs.BackgroundJobs;
import com.up24.news.jobs.JobHandler;
import com.up24.news.jobs.PermanentJobFailure;
import com.up24.news.media.MediaMigration;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.io.IOException;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

/** Copies outside DB transactions; a short reservation protects every destination. */
@Service
class MediaMigrationService implements MediaMigration,JobHandler {
    private static final String TYPE="media.image-migration.v1";
    private static final Duration COPY_LEASE=Duration.ofMinutes(5),LOCAL_GRACE=Duration.ofMinutes(10),ORPHAN_GRACE=Duration.ofMinutes(5);
    private static final Set<String> ACTIVE=Set.of("PENDING","DISPATCHED","RUNNING");
    private record Payload(UUID runId) {}
    private final MediaStore media;
    private final MigrationStore migrations;
    private final RetentionStore policies;
    private final FileBinaryStorage local;
    private final ObjectProvider<S3BinaryStorage> cloud;
    private final BackgroundJobs jobs;
    private final TransactionTemplate transaction;
    private final ObjectMapper json;
    private final Clock clock;
    private final long quota;
    MediaMigrationService(MediaStore media,MigrationStore migrations,RetentionStore policies,FileBinaryStorage local,
            ObjectProvider<S3BinaryStorage> cloud,BackgroundJobs jobs,PlatformTransactionManager manager,ObjectMapper json,Clock clock,
            @Value("${up24.media.quota-bytes}") long quota) {
        this.media=media;this.migrations=migrations;this.policies=policies;this.local=local;this.cloud=cloud;this.jobs=jobs;
        this.transaction=new TransactionTemplate(manager);this.json=json;this.clock=clock;this.quota=quota;
    }
    @Override public String type() { return TYPE; }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    @Override public Status status() {
        var run=migrations.read();String state="IDLE",error=run.error();
        if(run.completedAt()!=null) state="COMPLETED";
        else if(run.jobId()!=null) {
            try { var job=jobs.status(run.jobId());state=job.state();if(error==null) error=job.error(); }
            catch(IllegalArgumentException missing) { state="INTERRUPTED"; }
        } else if(run.id()!=null) state="INTERRUPTED";
        return new Status(cloud.getIfAvailable()!=null,state,run.jobId(),run.moved(),policies.counts().local(),run.startedAt(),run.completedAt(),error);
    }
    @Transactional @Override public Status start() {
        var s3=cloud.getIfAvailable();
        if(s3==null) throw invalid("Configure S3 storage before migrating local photographs.");
        var current=migrations.lock();
        if(current.jobId()!=null && current.completedAt()==null) {
            try { if(ACTIVE.contains(jobs.status(current.jobId()).state())) throw conflict("An image migration is already running."); }
            catch(IllegalArgumentException missing) { /* A retained run can outlive its job metadata. */ }
        }
        if(policies.counts().local()==0) throw invalid("There are no local photographs to migrate.");
        var runId=UUID.randomUUID();
        var jobId=jobs.submit(TYPE,BackgroundJobs.Lane.MEDIA,"image-migration:"+runId,new Payload(runId),clock.instant().plus(Duration.ofDays(2)));
        migrations.begin(runId,jobId,s3.settings().bucket(),s3.settings().prefix());
        return status();
    }
    @Override public void execute(UUID jobId,JsonNode payload) throws Exception {
        var input=json.treeToValue(payload,Payload.class);
        if(input.runId()==null) throw new PermanentJobFailure();
        var run=migrations.read();
        if(!current(run,input.runId(),jobId)) return;
        var s3=cloud.getIfAvailable();
        if(s3==null || !s3.settings().bucket().equals(run.bucket()) || !s3.settings().prefix().equals(run.prefix())) {
            migrations.error(input.runId(),jobId,"The configured S3 destination changed. Restore the original destination or start a new migration.");
            throw new PermanentJobFailure();
        }
        try {
            int considered=0;
            for(var image:media.localImages(20)) {
                if(!current(migrations.read(),input.runId(),jobId)) return;
                var destination=s3.target(image.id());
                var copy=new MigrationStore.Copy(image.id(),UUID.randomUUID(),destination,image.bytes(),clock.instant().plus(COPY_LEASE));
                if(!reserve(image,copy,input.runId(),jobId)) continue;
                considered++;
                try {
                    var file=local.delivery(image.location()).file();byte[] bytes;
                    try(var stream=Files.newInputStream(file)) { bytes=stream.readNBytes(2*1024*1024+1); }
                    if(bytes.length!=image.bytes() || bytes.length>2*1024*1024 || !HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)).equals(image.id()))
                        throw new IOException("The local photograph did not match its stored checksum.");
                    s3.put(destination,bytes);
                    if(!image.eligible()) s3.eligibility(destination,false);
                    finish(image,copy,input.runId(),jobId);
                } catch(Exception exception) {
                    abandon(copy);
                    throw exception;
                }
            }
            if(considered==0 && policies.counts().local()>0)
                throw new IllegalStateException("Local image copies are waiting for existing reservations.");
            transaction.executeWithoutResult(status -> {
                var latest=migrations.lock();
                if(!current(latest,input.runId(),jobId)) return;
                if(policies.counts().local()==0) migrations.complete(input.runId(),jobId);
                else {
                    var next=jobs.submit(TYPE,BackgroundJobs.Lane.MEDIA,"image-migration-next:"+jobId,new Payload(input.runId()),clock.instant().plus(Duration.ofDays(2)));
                    migrations.advance(input.runId(),jobId,next);
                }
            });
        } catch(Exception exception) {
            migrations.error(input.runId(),jobId,exception instanceof MediaProblem problem && problem.reason==MediaProblem.Reason.QUOTA
                    ? "Migration needs room for both copies. Increase the storage allowance or wait for pending local cleanup."
                    : "An image copy could not finish. Check S3 permissions, the original local files and the configured destination, then resume.");
            throw exception;
        }
    }
    private boolean reserve(MediaStore.LocalImage image,MigrationStore.Copy copy,UUID runId,UUID jobId) {
        return Boolean.TRUE.equals(transaction.execute(status -> {
            media.lockQuota();
            if(!current(migrations.read(),runId,jobId)) return false;
            var asset=media.find(image.id());var location=media.location(image.id());
            if(asset.isEmpty() || asset.get().version()!=image.version() || location.filter(image.location()::equals).isEmpty()) return false;
            if(!migrations.reserve(copy)) return false;
            media.completedDeletion(new MediaStore.Deletion(image.id(),copy.destination()));
            if(copy.bytes()>quota || media.usedBytes()>quota)
                throw new MediaProblem(MediaProblem.Reason.QUOTA,"Migration needs additional temporary storage capacity.");
            return true;
        }));
    }
    private void finish(MediaStore.LocalImage image,MigrationStore.Copy copy,UUID runId,UUID jobId) {
        transaction.executeWithoutResult(status -> {
            media.lockQuota();
            boolean switched=migrations.owns(copy) && current(migrations.read(),runId,jobId) && media.relocate(image,copy.destination());
            migrations.release(copy);
            if(switched) {
                media.completedDeletion(new MediaStore.Deletion(image.id(),copy.destination()));
                media.queueDeletion(new MediaStore.Deletion(image.id(),image.location()),image.bytes(),clock.instant().plus(LOCAL_GRACE));
                migrations.moved(runId);
            } else queueOrphan(copy);
        });
    }
    private void abandon(MigrationStore.Copy copy) {
        transaction.executeWithoutResult(status -> { media.lockQuota();migrations.release(copy);queueOrphan(copy); });
    }
    private void queueOrphan(MigrationStore.Copy copy) {
        if(media.location(copy.assetId()).filter(copy.destination()::equals).isEmpty())
            media.queueDeletion(new MediaStore.Deletion(copy.assetId(),copy.destination()),copy.bytes(),clock.instant().plus(ORPHAN_GRACE));
    }
    @Scheduled(fixedDelay=60000,initialDelay=60000)
    public void releaseExpiredCopies() {
        for(var copy:migrations.expired()) transaction.executeWithoutResult(status -> {
            media.lockQuota();if(migrations.release(copy)) queueOrphan(copy);
        });
    }
    private boolean current(MigrationStore.Run run,UUID runId,UUID jobId) { return runId.equals(run.id()) && jobId.equals(run.jobId()) && run.completedAt()==null; }
    private MediaProblem invalid(String text) { return new MediaProblem(MediaProblem.Reason.INVALID,text); }
    private MediaProblem conflict(String text) { return new MediaProblem(MediaProblem.Reason.IN_USE,text); }
}
