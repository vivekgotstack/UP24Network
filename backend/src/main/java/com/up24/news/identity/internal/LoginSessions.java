package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts.Account;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
class LoginSessions {
    static final Duration ACCESS_LIFETIME=Duration.ofMinutes(5);
    static final Duration SESSION_LIFETIME=Duration.ofDays(7);
    record Tokens(String access, String refresh, Instant sessionExpiresAt) {
        @Override public String toString() { return "Tokens[redacted]"; }
    }
    private final LoginSessionStore sessions;
    private final AccountRepository accounts;
    private final AccessTokenIssuer tokens;
    private final Clock clock;
    private final SecureRandom random=new SecureRandom();
    LoginSessions(LoginSessionStore sessions, AccountRepository accounts, AccessTokenIssuer tokens, Clock clock) {
        this.sessions=sessions; this.accounts=accounts; this.tokens=tokens; this.clock=clock;
    }
    private String newRefresh() {
        byte[] bytes=new byte[32]; random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    static String digest(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }
    private boolean plausible(String refresh) { return refresh!=null && refresh.matches("[A-Za-z0-9_-]{43}"); }
    @Transactional public Tokens start(Account account) {
        var now=clock.instant(); var id=UUID.randomUUID(); var refresh=newRefresh(); var expires=now.plus(SESSION_LIFETIME);
        sessions.create(id,account.id(),now,expires,digest(refresh));
        return new Tokens(tokens.issue(account,id,now,now.plus(ACCESS_LIFETIME)),refresh,expires);
    }
    @Transactional public Optional<Tokens> refresh(String refresh) {
        if (!plausible(refresh)) return Optional.empty();
        var locked=sessions.lockRefresh(digest(refresh));
        if (locked.isEmpty()) return Optional.empty();
        var previous=locked.get(); var session=previous.session(); var now=clock.instant();
        if (previous.revoked() || !now.isBefore(session.expiresAt())) return Optional.empty();
        if (previous.consumedAt()!=null) {
            // Return normally so the replay revocation commits instead of rolling back.
            sessions.revoke(session.id(),now);
            return Optional.empty();
        }
        var account=accounts.find(session.accountId());
        if (account.isEmpty()) { sessions.revoke(session.id(),now); return Optional.empty(); }
        var next=newRefresh();
        sessions.rotate(session.id(),digest(refresh),digest(next),now);
        return Optional.of(new Tokens(tokens.issue(account.get(),session.id(),now,now.plus(ACCESS_LIFETIME)),next,session.expiresAt()));
    }
    @Transactional public void logout(String refresh) {
        if (plausible(refresh)) sessions.lockRefresh(digest(refresh)).ifPresent(token -> sessions.revoke(token.session().id(),clock.instant()));
    }
    public void revoke(UUID sessionId) { sessions.revoke(sessionId,clock.instant()); }
    public void revokeAll(UUID accountId) { sessions.revokeAll(accountId,clock.instant()); }
    Optional<LoginSessionStore.Session> active(UUID id) { return sessions.active(id,clock.instant()); }
    void verify(UUID id, Account account) { sessions.verify(id,account.role().name(),clock.instant().plus(Duration.ofMinutes(30))); }
    void clearVerification(UUID id) { sessions.clearVerification(id); }
}
