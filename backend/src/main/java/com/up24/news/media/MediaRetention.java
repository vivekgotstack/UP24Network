package com.up24.news.media;

import jakarta.validation.constraints.*;
import java.time.Instant;

/** Administrator-controlled retention; independent of the object-storage SDK. */
public interface MediaRetention {
    record Policy(boolean enabled,int transitionDays,long version,Long appliedVersion,Instant appliedAt,String lastError) {}
    record Input(@NotNull Boolean enabled,@Min(90) @Max(3650) int transitionDays,@PositiveOrZero long version) {}
    record Eligibility(@NotNull Boolean eligible,@PositiveOrZero long version) {}
    record Status(String uploadBackend,boolean s3Configured,String bucket,String region,String prefix,String deliveryOrigin,
                  long localAssets,long s3Assets,long pendingDeletions,Policy policy) {}
    Status status();
    Status save(Input input);
    Status synchronize();
    MediaLibrary.Asset eligibility(String id,Eligibility input);
}
