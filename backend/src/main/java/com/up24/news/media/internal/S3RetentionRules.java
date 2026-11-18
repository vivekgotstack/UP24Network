package com.up24.news.media.internal;

import com.up24.news.media.MediaRetention;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import java.util.ArrayList;
import java.util.List;

/** Manages only the transition rules for the published image and video prefixes. */
final class S3RetentionRules {
    static final String RULE_ID="UP24Network-published-media-to-GIR";
    static final String VIDEO_RULE_ID="UP24Network-published-video-to-GIR";
    private static LifecycleRule rule(String id,MediaRetention.Policy policy,String prefix) {
        return LifecycleRule.builder().id(id).status(ExpirationStatus.ENABLED)
                .filter(LifecycleRuleFilter.builder().and(LifecycleRuleAndOperator.builder().prefix(prefix)
                        .tags(Tag.builder().key("up24-retention").value("gir-eligible").build())
                        .objectSizeGreaterThan(131071L).build()).build())
                .transitions(Transition.builder().days(policy.transitionDays()).storageClass(TransitionStorageClass.GLACIER_IR).build()).build();
    }
    static void apply(S3Client client,S3Settings settings,MediaRetention.Policy policy) {
        List<LifecycleRule> existing;
        TransitionDefaultMinimumObjectSize minimum=null;
        try {
            var configuration=client.getBucketLifecycleConfiguration(GetBucketLifecycleConfigurationRequest.builder().bucket(settings.bucket()).build());
            existing=configuration.rules();minimum=configuration.transitionDefaultMinimumObjectSize();
        }
        catch(S3Exception exception) {
            if(exception.awsErrorDetails()==null || !"NoSuchLifecycleConfiguration".equals(exception.awsErrorDetails().errorCode())) throw exception;
            existing=List.of();
        }
        var next=new ArrayList<>(existing.stream().filter(rule -> !RULE_ID.equals(rule.id()) && !VIDEO_RULE_ID.equals(rule.id())).toList());
        if(policy.enabled()) {
            next.add(rule(RULE_ID,policy,settings.prefix()));
            next.add(rule(VIDEO_RULE_ID,policy,settings.videoPrefix()));
        }
        if(next.equals(existing)) return;
        if(next.size()>1000) throw new IllegalStateException("The S3 bucket lifecycle rule limit has been reached.");
        if(next.isEmpty()) client.deleteBucketLifecycle(DeleteBucketLifecycleRequest.builder().bucket(settings.bucket()).build());
        else client.putBucketLifecycleConfiguration(PutBucketLifecycleConfigurationRequest.builder().bucket(settings.bucket())
                .transitionDefaultMinimumObjectSize(minimum)
                .lifecycleConfiguration(BucketLifecycleConfiguration.builder().rules(next).build()).build());
    }
}
