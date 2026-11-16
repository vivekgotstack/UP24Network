package com.up24.news.identity.internal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Clock;

/** Delete bounded batches so expired logins cannot accumulate indefinitely. */
@Component
class IdentityRetention {
    private final JdbcTemplate jdbc;
    private final Clock clock;
    IdentityRetention(JdbcTemplate jdbc,Clock clock) { this.jdbc=jdbc; this.clock=clock; }
    @Scheduled(fixedDelayString="${up24.auth.retention.interval-ms:60000}",initialDelayString="${up24.auth.retention.interval-ms:60000}")
    @Transactional
    public void cleanExpired() {
        var now=Timestamp.from(clock.instant());
        // Cascade removes consumed refresh digests only once their replay window ends.
        jdbc.update("DELETE FROM identity_login_session WHERE id IN (SELECT id FROM identity_login_session WHERE expires_at<=? ORDER BY expires_at LIMIT 250 FOR UPDATE SKIP LOCKED)",now);
        jdbc.update("DELETE FROM identity_password_recovery WHERE account_id IN (SELECT account_id FROM identity_password_recovery WHERE expires_at<=? ORDER BY expires_at LIMIT 250 FOR UPDATE SKIP LOCKED)",now);
        jdbc.update("DELETE FROM identity_newsroom_otp WHERE email IN (SELECT email FROM identity_newsroom_otp WHERE expires_at<=? AND window_started_at<=? ORDER BY expires_at LIMIT 250 FOR UPDATE SKIP LOCKED)",now,Timestamp.from(clock.instant().minusSeconds(3600)));
    }
}
