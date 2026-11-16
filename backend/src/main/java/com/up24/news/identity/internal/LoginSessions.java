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
    record Tokens(UUID sessionId, String access, String refresh, Instant sessionExpiresAt) {
        @Override public String toString() { return "Tokens[redacted]"; }
    }
    static final class LoginUnavailable extends RuntimeException {}
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
        return start(account,null);
    }
    @Transactional public Tokens start(Account account,Long authenticatedVersion) {
        var current=accounts.lock(account.id()).filter(Account::enabled).orElseThrow(LoginUnavailable::new);
        if(authenticatedVersion!=null && current.version()!=authenticatedVersion) throw new LoginUnavailable();
        var now=clock.instant();
        return create(current,now,now.plus(SESSION_LIFETIME));
    }
    private Tokens create(Account account, Instant now, Instant expires) {
        var id=UUID.randomUUID(); var refresh=newRefresh();
        sessions.create(id,account.id(),now,expires,digest(refresh));
        return new Tokens(id,tokens.issue(account,id,now,now.plus(ACCESS_LIFETIME)),refresh,expires);
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
        if (account.isEmpty() || !account.get().enabled()) { sessions.revoke(session.id(),now); return Optional.empty(); }
        var next=newRefresh();
        sessions.rotate(session.id(),digest(refresh),digest(next),now);
        return Optional.of(new Tokens(session.id(),tokens.issue(account.get(),session.id(),now,now.plus(ACCESS_LIFETIME)),next,session.expiresAt()));
    }
    @Transactional public void logout(String refresh) {
        if (plausible(refresh)) sessions.lockRefresh(digest(refresh)).ifPresent(token -> sessions.revoke(token.session().id(),clock.instant()));
    }
    public void revoke(UUID sessionId) { sessions.revoke(sessionId,clock.instant()); }
    public void revokeAll(UUID accountId) { sessions.revokeAll(accountId,clock.instant()); }
    Optional<LoginSessionStore.Session> active(UUID id) { return sessions.active(id,clock.instant()); }
    @Transactional public Optional<Tokens> stepUp(UUID id, Account account) {
        var now=clock.instant();
        var previous=sessions.lockActive(id,now).filter(session -> session.accountId().equals(account.id()));
        if (previous.isEmpty()) return Optional.empty();
        // Retire password-only tokens when OTP grants privileged access.
        var next=create(account,now,previous.get().expiresAt());
        sessions.verify(next.sessionId(),account.role().name(),now.plus(Duration.ofMinutes(30)));
        sessions.revoke(id,now);
        return Optional.of(next);
    }
    void clearVerification(UUID id) { sessions.clearVerification(id); }
}
