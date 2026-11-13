package com.up24.news.identity.internal;

import java.time.Instant;
import java.util.UUID;
import java.util.function.Function;

interface LoginChallengeStore {
    void reserve(String email,UUID challenge,String sessionDigest,String codeDigest,Instant now,Instant expiresAt);
    boolean consume(String email,String sessionDigest,Function<UUID,String> candidateDigest,Instant now);
    void invalidate(String email,UUID challenge);
}
