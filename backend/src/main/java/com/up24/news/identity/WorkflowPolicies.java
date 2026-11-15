package com.up24.news.identity;

import jakarta.validation.constraints.*;
import java.util.UUID;

/** Editorial preferences are an identity API, independent of article storage. */
public interface WorkflowPolicies {
    record Policy(UUID accountId,boolean requireDateline,boolean requireSources,boolean requireMedia,
                  boolean autofill,String defaultCategory,String defaultCity,long version) {}
    record Input(@NotNull Boolean requireDateline,@NotNull Boolean requireSources,@NotNull Boolean requireMedia,
                 @NotNull Boolean autofill,@NotNull @Size(max=100) String defaultCategory,
                 @NotNull @Size(max=100) String defaultCity,@PositiveOrZero long version) {}
    Policy get(UUID accountId);
    Policy save(UUID accountId,Input input);
}
