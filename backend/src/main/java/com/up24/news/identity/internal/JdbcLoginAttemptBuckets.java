package com.up24.news.identity.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

@Repository
class JdbcLoginAttemptBuckets implements LoginAttemptBuckets {
    private final JdbcTemplate jdbc;
    private final int capacity;
    JdbcLoginAttemptBuckets(JdbcTemplate jdbc, @Value("${up24.auth.login-throttle.capacity:20000}") int capacity) {
        if (capacity<100 || capacity>1_000_000) throw new IllegalArgumentException("Set a login throttle capacity between 100 and 1000000.");
        this.jdbc=jdbc; this.capacity=capacity;
    }
    private Optional<Bucket> increment(String key, Instant now, Instant expiresAt, int limit) {
        return jdbc.query("""
                UPDATE identity_login_attempt_bucket SET
                  attempts=CASE WHEN expires_at<=? THEN 1 ELSE LEAST(attempts+1,?) END,
                  expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END
                WHERE bucket_key=? RETURNING attempts,expires_at
                """,(row,index) -> new Bucket(row.getInt("attempts"),row.getTimestamp("expires_at").toInstant()),
                Timestamp.from(now),limit+1,Timestamp.from(now),Timestamp.from(expiresAt),key).stream().findFirst();
    }
    @Transactional @Override public Optional<Bucket> recordAttempt(String key, Instant now, Instant expiresAt, int limit) {
        var existing=increment(key,now,expiresAt,limit);
        if (existing.isPresent()) return existing;
        // Serialize only creation, not ordinary attempts, to enforce a hard storage bound.
        jdbc.query("SELECT pg_advisory_xact_lock(hashtext(current_schema()),241124)",(row,index) -> 1);
        existing=increment(key,now,expiresAt,limit);
        if (existing.isPresent()) return existing;
        int count=jdbc.queryForObject("SELECT count(*) FROM identity_login_attempt_bucket",Integer.class);
        if (count>=capacity) {
            jdbc.update("DELETE FROM identity_login_attempt_bucket WHERE expires_at<=?",Timestamp.from(now));
            count=jdbc.queryForObject("SELECT count(*) FROM identity_login_attempt_bucket",Integer.class);
            if (count>=capacity) return Optional.empty();
        }
        jdbc.update("INSERT INTO identity_login_attempt_bucket(bucket_key,attempts,expires_at) VALUES (?,1,?)",key,Timestamp.from(expiresAt));
        return Optional.of(new Bucket(1,expiresAt));
    }
    @Override public void removeExpired(Instant now) {
        jdbc.update("""
                DELETE FROM identity_login_attempt_bucket WHERE bucket_key IN
                (SELECT bucket_key FROM identity_login_attempt_bucket WHERE expires_at<=? ORDER BY expires_at LIMIT 1000)
                """,Timestamp.from(now));
    }
}
