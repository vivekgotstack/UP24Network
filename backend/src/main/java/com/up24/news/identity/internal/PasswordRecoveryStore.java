package com.up24.news.identity.internal;

import java.time.Instant;
import java.util.UUID;
import java.util.function.Function;

interface PasswordRecoveryStore {
    boolean reserve(UUID accountId,long accountVersion,UUID challenge,String digest,Instant now,Instant expiresAt);
    boolean consume(UUID accountId,long accountVersion,Function<UUID,String> candidate,Instant now);
    void invalidate(UUID accountId,UUID challenge);
}
