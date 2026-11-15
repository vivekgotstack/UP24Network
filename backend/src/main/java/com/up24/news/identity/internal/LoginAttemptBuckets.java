package com.up24.news.identity.internal;

import java.time.Instant;
import java.util.Optional;

interface LoginAttemptBuckets {
    record Bucket(int attempts, Instant expiresAt) {}
    /** Empty means the bounded bucket store is at capacity. */
    Optional<Bucket> recordAttempt(String key, Instant now, Instant expiresAt, int limit);
    void removeExpired(Instant now);
}
