package com.up24.news.media.internal;

import com.up24.news.media.MediaRetention;
import java.util.Optional;
import java.util.UUID;

interface RetentionStore {
    record Counts(long local,long s3,long deletions) {}
    record Claim(UUID token,MediaRetention.Policy policy) {}
    MediaRetention.Policy policy();
    Counts counts();
    boolean save(MediaRetention.Input input);
    Optional<Claim> claim(boolean force);
    void applied(Claim claim);
    void failed(Claim claim);
}
