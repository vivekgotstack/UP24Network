package com.up24.news.identity.internal;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Function;

@Repository
class JdbcLoginChallengeStore implements LoginChallengeStore {
    record Challenge(UUID id,String sessionDigest,String codeDigest,Instant requestedAt,Instant expiresAt,
                     int attempts,Instant windowStarted,int requests) {}
    private final JdbcTemplate jdbc;
    JdbcLoginChallengeStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    private Challenge locked(String email) {
        return jdbc.query("SELECT * FROM identity_newsroom_otp WHERE email=? FOR UPDATE",(row,index)->
                new Challenge(row.getObject("challenge_id",UUID.class),row.getString("session_digest"),row.getString("code_digest"),
                        row.getTimestamp("requested_at").toInstant(),row.getTimestamp("expires_at").toInstant(),row.getInt("attempts"),
                        row.getTimestamp("window_started_at").toInstant(),row.getInt("requests")),email).stream().findFirst().orElse(null);
    }

    @Transactional @Override public void reserve(String email,UUID challenge,String sessionDigest,String codeDigest,Instant now,Instant expiresAt) {
        jdbc.update("""
                INSERT INTO identity_newsroom_otp(email,challenge_id,session_digest,requested_at,expires_at,window_started_at)
                VALUES (?,?,?,'epoch','epoch',?) ON CONFLICT(email) DO NOTHING
                """,email,challenge,sessionDigest,Timestamp.from(now));
        var existing=locked(email);
        boolean newWindow=!now.isBefore(existing.windowStarted().plus(Duration.ofHours(1)));
        if (now.isBefore(existing.requestedAt().plusSeconds(60)) || (!newWindow && existing.requests()>=5))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Please wait before requesting another code. Up to five emails are allowed per hour.");
        jdbc.update("""
                UPDATE identity_newsroom_otp SET challenge_id=?,session_digest=?,code_digest=?,requested_at=?,expires_at=?,
                attempts=0,window_started_at=?,requests=? WHERE email=?
                """,challenge,sessionDigest,codeDigest,Timestamp.from(now),Timestamp.from(expiresAt),
                Timestamp.from(newWindow?now:existing.windowStarted()),newWindow?1:existing.requests()+1,email);
    }

    @Transactional @Override public boolean consume(String email,String sessionDigest,Function<UUID,String> candidateDigest,Instant now) {
        var challenge=locked(email);
        if (challenge==null || challenge.codeDigest()==null || challenge.attempts()>=5
                || !now.isBefore(challenge.expiresAt()) || !sessionDigest.equals(challenge.sessionDigest())) return false;
        boolean matches=MessageDigest.isEqual(challenge.codeDigest().getBytes(StandardCharsets.US_ASCII),
                candidateDigest.apply(challenge.id()).getBytes(StandardCharsets.US_ASCII));
        if (matches) jdbc.update("UPDATE identity_newsroom_otp SET code_digest=NULL WHERE email=?",email);
        else jdbc.update("UPDATE identity_newsroom_otp SET attempts=attempts+1 WHERE email=?",email);
        return matches;
    }

    @Override public void invalidate(String email,UUID challenge) {
        jdbc.update("UPDATE identity_newsroom_otp SET code_digest=NULL WHERE email=? AND challenge_id=?",email,challenge);
    }
}
