package com.up24.news.media.internal;

import com.up24.news.article.ArticleMediaUsage;
import com.up24.news.jobs.BackgroundJobs;
import com.up24.news.jobs.PermanentJobFailure;
import com.up24.news.media.MediaVideos;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.*;

@Service
class VideoService implements MediaVideos {
    static final String PROCESS="media.video-encode.v1",DELETE="media.video-delete.v1";
    private final VideoStore store;
    private final VideoSettings settings;
    private final VideoProcessor processor;
    private final BinaryStorage images;
    private final LocalVideoObjects local;
    private final S3VideoObjects cloud;
    private final BackgroundJobs jobs;
    private final ArticleMediaUsage usage;
    private final Clock clock;
    private final TransactionTemplate tx;
    VideoService(VideoStore store,VideoSettings settings,VideoProcessor processor,BinaryStorage images,LocalVideoObjects local,S3VideoObjects cloud,
            BackgroundJobs jobs,ArticleMediaUsage usage,Clock clock,PlatformTransactionManager transactions) {
        this.store=store;this.settings=settings;this.processor=processor;this.images=images;this.local=local;this.cloud=cloud;
        this.jobs=jobs;this.usage=usage;this.clock=clock;tx=new TransactionTemplate(transactions);
    }
    private VideoObjects objects(String backend) { return backend.equals("S3")?cloud:local; }
    private VideoStore.Stored owned(UUID id,UUID actor,boolean privileged,boolean lock) {
        var value=(lock?store.lock(id):store.find(id)).orElseThrow(()->new MediaProblem(MediaProblem.Reason.MISSING,"Video not found."));
        if(!privileged && !Objects.equals(actor,value.owner())) throw new MediaProblem(MediaProblem.Reason.MISSING,"Video not found.");
        return value;
    }
    private void tools() { if(!processor.available()) throw new MediaProblem(MediaProblem.Reason.STORAGE,"Video processing is unavailable. Configure ffmpeg and ffprobe on the backend before uploading."); }
    @Transactional @Override public Ticket ticket(String name,long bytes,UUID actor) {
        tools();
        if(name==null || name.length()>255 || !name.toLowerCase(Locale.ROOT).matches(".+\\.(mp4|mov)$") || bytes<12 || bytes>settings.maxUploadBytes)
            throw new MediaProblem(MediaProblem.Reason.INVALID,"Choose one MP4 or MOV video within the configured upload limit.");
        store.quotaLock();long reserve=Math.addExact(bytes,settings.maxUploadBytes);
        if(store.pendingFor(actor)>=3) throw new MediaProblem(MediaProblem.Reason.IN_USE,"Finish or wait for your existing video uploads before starting another.");
        if(reserve>settings.quotaBytes || store.reservedBytes()>settings.quotaBytes-reserve)
            throw new MediaProblem(MediaProblem.Reason.QUOTA,"The video storage allowance is full. Ask the administrator to remove unused media or increase the allowance.");
        UUID id=UUID.randomUUID();var storage=objects(images.backend());var source=storage.source(id);
        var expiry=clock.instant().plusSeconds(900);
        String safeName=name.replaceAll("[\\p{Cntrl}\\\\/]","_");
        store.insert(id,safeName,bytes,reserve,actor,source,source.backend().equals("S3")?expiry:clock.instant().plusSeconds(7200));
        var signed=storage.signedUpload(source,bytes);
        return new Ticket(store.find(id).orElseThrow().view(),source.backend().equals("S3"),signed.url(),signed.headers(),expiry);
    }
    void receive(UUID id,UUID actor,boolean privileged,InputStream input,long declared) throws IOException {
        var video=owned(id,actor,privileged,false);
        if(!video.source().backend().equals("LOCAL") || !video.view().state().equals("UPLOADING") || declared!=video.view().originalBytes())
            throw new MediaProblem(MediaProblem.Reason.INVALID,"Use the reserved upload address and exact file size.");
        var token=UUID.randomUUID();
        if(!store.acquireUpload(id,token)) throw new MediaProblem(MediaProblem.Reason.IN_USE,"This upload is expired or is already being received.");
        try { local.receive(id,input,declared); }
        catch(IOException exception) { throw new MediaProblem(MediaProblem.Reason.STORAGE,"The upload was interrupted or staging storage is unavailable. Create a new upload if it has expired."); }
        finally { store.releaseUpload(id,token); }
    }
    @Transactional @Override public Video complete(UUID id,UUID actor,boolean privileged) {
        var video=owned(id,actor,privileged,true);
        if(Set.of("READY","QUEUED","PROCESSING").contains(video.view().state())) return video.view();
        if(!video.view().state().equals("UPLOADING") || !clock.instant().isBefore(video.expiresAt()))
            throw new MediaProblem(MediaProblem.Reason.INVALID,"This upload has expired. Start a new upload.");
        try { objects(video.source().backend()).verifySource(video); }
        catch(IOException exception) { throw new MediaProblem(MediaProblem.Reason.INVALID,"The complete video source could not be verified. Finish uploading the reserved file first."); }
        UUID job=jobs.submit(PROCESS,BackgroundJobs.Lane.MEDIA,"video-encode:"+id+":"+video.view().version(),Map.of("videoId",id),clock.instant().plusSeconds(172800));
        store.queued(id,job);return store.find(id).orElseThrow().view();
    }
    @Transactional @Override public Video retry(UUID id,long version,UUID actor,boolean privileged) {
        tools();var video=owned(id,actor,privileged,true);
        if(!video.view().state().equals("FAILED") || video.view().version()!=version)
            throw new MediaProblem(MediaProblem.Reason.IN_USE,"Reload the failed video before retrying.");
        UUID job=jobs.submit(PROCESS,BackgroundJobs.Lane.MEDIA,"video-retry:"+id+":"+version,Map.of("videoId",id),clock.instant().plusSeconds(172800));
        store.queued(id,job);return store.find(id).orElseThrow().view();
    }
    @Override public Video get(UUID id,UUID actor,boolean privileged) { return owned(id,actor,privileged,false).view(); }
    @Override public Page list(UUID actor,boolean privileged,int page,int size) {
        var result=store.list(actor,privileged,Math.max(1,page),Math.clamp(size,1,24));
        return new Page(result.items(),result.total(),result.page(),result.size(),result.pages(),result.reservedBytes(),settings.quotaBytes,processor.available(),settings.maxUploadBytes);
    }
    @Override public void remove(UUID id) {
        tx.executeWithoutResult(status->{
            var video=store.lock(id).orElseThrow(()->new MediaProblem(MediaProblem.Reason.MISSING,"Video not found."));
            if(video.view().state().equals("PROCESSING")) throw new MediaProblem(MediaProblem.Reason.IN_USE,"Wait for video processing to finish before removing it.");
            if(video.uploadLeaseUntil()!=null && clock.instant().isBefore(video.uploadLeaseUntil())) throw new MediaProblem(MediaProblem.Reason.IN_USE,"Wait for the active upload to stop before removing its reservation.");
            if(video.source().backend().equals("S3") && clock.instant().isBefore(video.expiresAt())) throw new MediaProblem(MediaProblem.Reason.IN_USE,"This signed upload reservation is still valid. Remove the unused video after its 15-minute upload window expires.");
            if(usage.inUse(video.view().url())) throw new MediaProblem(MediaProblem.Reason.IN_USE,"This video is used by an article or a retained revision.");
            if(video.view().state().equals("DELETING") && video.jobId()!=null) {
                try { if(!jobs.status(video.jobId()).state().equals("FAILED")) return; }
                catch(IllegalArgumentException ignored) { }
            }
            UUID job=jobs.submit(DELETE,BackgroundJobs.Lane.MEDIA,"video-delete:"+id+":"+video.view().version(),Map.of("videoId",id),clock.instant().plusSeconds(172800));
            store.deleting(id,job);
        });
    }
    void cancel(UUID id,UUID actor,boolean administrator) {
        tx.executeWithoutResult(status->{
            var video=owned(id,actor,administrator,true);
            if(!administrator && !Set.of("UPLOADING","FAILED").contains(video.view().state()))
                throw new MediaProblem(MediaProblem.Reason.INVALID,"Only an administrator can remove completed or queued videos.");
            remove(id);
        });
    }
    void process(UUID jobId,UUID id) throws Exception {
        UUID token=UUID.randomUUID();
        var video=tx.execute(status->{
            var current=store.lock(id).orElse(null);
            if(current==null || !Set.of("QUEUED","PROCESSING").contains(current.view().state()) || !Objects.equals(jobId,current.jobId())) return null;
            return store.processing(id,token)?current:null;
        });
        if(video==null) return;
        Path source=null,encoded=settings.encoded(id,token);
        try {
            tools();Files.createDirectories(settings.work(id));
            source=objects(video.source().backend()).materialize(video,token);
            var probe=processor.encode(source,encoded);
            String hash=checksum(encoded);long bytes=Files.size(encoded);
            var output=objects(video.source().backend()).publish(id,encoded,hash);
            tx.executeWithoutResult(status->{store.ready(id,token,output,bytes,hash,probe);});
        } catch(Exception exception) {
            boolean terminal=exception instanceof PermanentJobFailure || jobs.status(jobId).attempts()>=5;
            tx.executeWithoutResult(status->store.failed(id,token,terminal));
            if(terminal) throw new PermanentJobFailure();
            throw exception;
        } finally {
            Files.deleteIfExists(encoded);
            if(source!=null && video.source().backend().equals("S3")) Files.deleteIfExists(source);
        }
    }
    void deleteObjects(UUID id) throws Exception {
        var video=store.find(id).orElse(null);if(video==null || !video.view().state().equals("DELETING")) return;
        try {
            var storage=objects(video.source().backend());
            storage.delete(video.source());if(video.output()!=null) storage.delete(video.output());
            tx.executeWithoutResult(status->{var current=store.lock(id);if(current.filter(v->v.view().state().equals("DELETING")).isPresent())store.delete(id);});
        } catch(Exception exception) { store.deletionFailed(id);throw exception; }
    }
    BinaryStorage.Delivery delivery(UUID id) {
        var video=store.find(id).filter(value->value.view().state().equals("READY")).orElseThrow(()->new MediaProblem(MediaProblem.Reason.MISSING,"Video not found."));
        return objects(video.output().backend()).delivery(video.output());
    }
    VideoStore.Stored publicVideo(UUID id) { return store.find(id).filter(value->value.view().state().equals("READY")).orElseThrow(()->new MediaProblem(MediaProblem.Reason.MISSING,"Video not found.")); }
    private static String checksum(Path path) throws Exception {
        var digest=MessageDigest.getInstance("SHA-256");
        try(var input=Files.newInputStream(path)) { byte[] bytes=new byte[65536];for(int count;(count=input.read(bytes))!=-1;)digest.update(bytes,0,count); }
        return HexFormat.of().formatHex(digest.digest());
    }
    @Scheduled(fixedDelay=300000,initialDelay=300000)
    public void expireUploads() {
        for(var id:store.abandoned()) remove(id);
        for(var video:store.unfinished()) if(video.jobId()!=null) {
            try { if(jobs.status(video.jobId()).state().equals("FAILED")) store.terminal(video.view().id(),video.jobId()); }
            catch(IllegalArgumentException missing) { store.terminal(video.view().id(),video.jobId()); }
        }
    }
}
