package com.up24.news.media.internal;

import com.up24.news.media.MediaLibrary;
import com.up24.news.media.MediaRetention;
import jakarta.validation.Validator;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MediaRetentionService implements MediaRetention {
    private final RetentionStore policies;
    private final MediaStore media;
    private final BinaryStorage storage;
    private final ObjectProvider<S3BinaryStorage> cloud;
    private final Validator validator;
    MediaRetentionService(RetentionStore policies,MediaStore media,BinaryStorage storage,ObjectProvider<S3BinaryStorage> cloud,Validator validator) {
        this.policies=policies;this.media=media;this.storage=storage;this.cloud=cloud;this.validator=validator;
    }
    @Override public Status status() {
        var s3=cloud.getIfAvailable(); var counts=policies.counts();
        return new Status(storage.backend(),s3!=null,s3==null?"":s3.settings().bucket(),s3==null?"":s3.settings().region(),
                s3==null?"":s3.settings().prefix(),s3==null?"":s3.settings().cdnUrl(),counts.local(),counts.s3(),counts.deletions(),policies.policy());
    }
    @Transactional @Override public Status save(Input input) {
        if(input==null || !validator.validate(input).isEmpty()) throw invalid("Use a transition age between 90 and 3650 days and the current policy version.");
        if(!policies.save(input)) throw conflict();
        return status();
    }
    @Transactional @Override public MediaLibrary.Asset eligibility(String id,Eligibility input) {
        if(input==null || !validator.validate(input).isEmpty()) throw invalid("A media eligibility choice and current version are required.");
        media.lockQuota();
        var asset=media.find(id).orElseThrow(() -> new MediaProblem(MediaProblem.Reason.MISSING,"Image not found."));
        if(asset.version()!=input.version() || !media.eligibility(id,input.version(),input.eligible())) throw conflict();
        return media.find(id).orElseThrow();
    }
    @Override public Status synchronize() {
        var s3=cloud.getIfAvailable();
        if(s3==null) throw invalid("Configure S3 storage in the backend environment before applying an AWS retention rule.");
        sync(s3,true);
        return status();
    }
    private void sync(S3BinaryStorage s3,boolean force) {
        var claim=policies.claim(force);
        if(claim.isEmpty()) {
            if(force) throw new MediaProblem(MediaProblem.Reason.IN_USE,"A retention synchronization is already running. Try again shortly.");
            return;
        }
        try {
            S3RetentionRules.apply(s3.client(),s3.settings(),claim.get().policy());
            policies.applied(claim.get());
        } catch(RuntimeException exception) {
            policies.failed(claim.get());
            if(force) throw new MediaProblem(MediaProblem.Reason.STORAGE,"The AWS rule could not be applied. Check your bucket configuration and IAM permissions.");
        }
    }
    @Scheduled(fixedDelayString="${up24.media.retention.interval-ms:60000}",initialDelayString="${up24.media.retention.interval-ms:60000}")
    public void reconcile() {
        var s3=cloud.getIfAvailable();
        if(s3==null) return;
        for(var change:media.dueTags()) {
            try { s3.eligibility(change.location(),change.eligible());media.appliedTag(change); }
            catch(RuntimeException exception) { media.failedTag(change); }
        }
        sync(s3,false);
    }
    private MediaProblem invalid(String text) { return new MediaProblem(MediaProblem.Reason.INVALID,text); }
    private MediaProblem conflict() { return new MediaProblem(MediaProblem.Reason.IN_USE,"This setting changed. Reload it before saving."); }
}
