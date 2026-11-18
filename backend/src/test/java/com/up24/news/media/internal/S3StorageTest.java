package com.up24.news.media.internal;

import com.up24.news.media.MediaRetention;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class S3StorageTest {
    private final S3Settings settings=new S3Settings("up24-storage-test","ap-south-1","up24/published/images/","https://media.example.test");
    private MediaRetention.Policy policy(boolean enabled) { return new MediaRetention.Policy(enabled,365,1,null,null,null); }
    @Test void immutableUploadsUseStandardChecksumsAndTheExistingPublicDeliveryAddress() throws Exception {
        var client=mock(S3Client.class); var storage=new S3BinaryStorage(client,settings);
        byte[] bytes="test-content".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] hash=MessageDigest.getInstance("SHA-256").digest(bytes);
        String id=HexFormat.of().formatHex(hash);
        var location=storage.target(id);
        storage.put(location,bytes);
        var request=ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client).putObject(request.capture(),any(RequestBody.class));
        assertThat(request.getValue().storageClass()).isEqualTo(StorageClass.STANDARD);
        assertThat(request.getValue().ifNoneMatch()).isEqualTo("*");
        assertThat(request.getValue().checksumSHA256()).isEqualTo(Base64.getEncoder().encodeToString(hash));
        assertThat(request.getValue().tagging()).isEqualTo("up24-retention=gir-eligible");
        assertThat(storage.delivery(location).redirect().toString()).isEqualTo(settings.cdnUrl()+"/"+location.key());
        assertThatThrownBy(() -> storage.delivery(new StorageLocation("S3","other-bucket",location.key()))).isInstanceOf(MediaProblem.class);
    }
    @Test void retentionUsesAnEligibleTagAndMinimumSizeAndPreservesOtherRulesWhenEnabledOrDisabled() {
        var client=mock(S3Client.class);
        var unrelated=LifecycleRule.builder().id("separate-backup-policy").status(ExpirationStatus.ENABLED).filter(LifecycleRuleFilter.builder().prefix("backups/").build())
                .expiration(LifecycleExpiration.builder().days(100).build()).build();
        when(client.getBucketLifecycleConfiguration(any(GetBucketLifecycleConfigurationRequest.class)))
                .thenReturn(GetBucketLifecycleConfigurationResponse.builder().rules(unrelated).build());
        S3RetentionRules.apply(client,settings,policy(true));
        var requests=ArgumentCaptor.forClass(PutBucketLifecycleConfigurationRequest.class);
        verify(client).putBucketLifecycleConfiguration(requests.capture());
        var rules=requests.getValue().lifecycleConfiguration().rules();
        assertThat(rules).contains(unrelated).hasSize(3);
        var managed=rules.stream().filter(rule -> rule.id().equals(S3RetentionRules.RULE_ID)).findFirst().orElseThrow();
        assertThat(managed.transitions().getFirst().storageClass()).isEqualTo(TransitionStorageClass.GLACIER_IR);
        assertThat(managed.transitions().getFirst().days()).isEqualTo(365);
        assertThat(managed.filter().and().prefix()).isEqualTo(settings.prefix());
        assertThat(managed.filter().and().objectSizeGreaterThan()).isEqualTo(131071L);
        assertThat(managed.filter().and().tags()).extracting(Tag::value).containsExactly("gir-eligible");
        var video=rules.stream().filter(rule -> rule.id().equals(S3RetentionRules.VIDEO_RULE_ID)).findFirst().orElseThrow();
        assertThat(video.filter().and().prefix()).isEqualTo(settings.videoPrefix());
        assertThat(video.transitions()).isEqualTo(managed.transitions());
        clearInvocations(client);
        when(client.getBucketLifecycleConfiguration(any(GetBucketLifecycleConfigurationRequest.class)))
                .thenReturn(GetBucketLifecycleConfigurationResponse.builder().rules(rules).build());
        S3RetentionRules.apply(client,settings,policy(false));
        verify(client).putBucketLifecycleConfiguration(requests.capture());
        assertThat(requests.getValue().lifecycleConfiguration().rules()).containsExactly(unrelated);
        verify(client,never()).deleteBucketLifecycle(any(DeleteBucketLifecycleRequest.class));
    }
    @Test void excludingMediaChangesOnlyOurRetentionTag() {
        var client=mock(S3Client.class); var storage=new S3BinaryStorage(client,settings);
        when(client.getObjectTagging(any(GetObjectTaggingRequest.class))).thenReturn(GetObjectTaggingResponse.builder().tagSet(
                Tag.builder().key("editorial-rights").value("owned").build(),Tag.builder().key("up24-retention").value("gir-eligible").build()).build());
        storage.eligibility(storage.target("a".repeat(64)),false);
        var request=ArgumentCaptor.forClass(PutObjectTaggingRequest.class);
        verify(client).putObjectTagging(request.capture());
        assertThat(request.getValue().tagging().tagSet()).extracting(Tag::key).containsExactly("editorial-rights","up24-retention");
        assertThat(request.getValue().tagging().tagSet()).extracting(Tag::value).containsExactly("owned","excluded");
    }
}
