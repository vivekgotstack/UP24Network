package com.up24.news.identity.internal;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface LoginSessionStore {
    record Session(UUID id, UUID accountId, Instant expiresAt, Instant verifiedUntil, String verifiedRole) {}
    record Refresh(Session session, Instant consumedAt, boolean revoked) {}
    void create(UUID id, UUID accountId, Instant now, Instant expiresAt, String refreshDigest);
    Optional<Session> active(UUID id, Instant now);
    Optional<Session> lockActive(UUID id, Instant now);
    Optional<Refresh> lockRefresh(String digest);
    void rotate(UUID sessionId, String previousDigest, String replacementDigest, Instant now);
    void revoke(UUID id, Instant now);
    void revokeAll(UUID accountId, Instant now);
    void verify(UUID id, String role, Instant until);
    void clearVerification(UUID id);
}
