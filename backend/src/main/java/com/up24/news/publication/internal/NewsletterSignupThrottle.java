package com.up24.news.publication.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;

@Repository
class NewsletterSignupThrottle {
    record Reservation(Instant expiresAt, String recipientKey) {}

    static final class LimitReached extends RuntimeException {
        final long retryAfterSeconds;
        LimitReached(long retryAfterSeconds) { this.retryAfterSeconds = retryAfterSeconds; }
    }

    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final SecretKeySpec key;

    NewsletterSignupThrottle(JdbcTemplate jdbc, Clock clock,
            @Value("${up24.auth.login-throttle.secret:${up24.newsroom.otp-secret:}}") String secret) {
        this.jdbc = jdbc;
        this.clock = clock;
        key = new SecretKeySpec(HexFormat.of().parseHex(secret), "HmacSHA256");
    }

    @Transactional
    public Optional<Reservation> reserve(String email, String ipAddress) {
        Instant now = clock.instant();
        Instant expiresAt = now.truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS);
        Timestamp expires = Timestamp.from(expiresAt);
        if (!claim(expires, fingerprint("address", ipAddress), 6) || !claim(expires, "global", 120)) {
            throw new LimitReached(Math.max(1, Duration.between(now, expiresAt).toSeconds() + 1));
        }
        String recipientKey = fingerprint("recipient", email);
        // Repeat requests return the same public response without resending a confirmation email.
        return claim(expires, recipientKey, 1) ? Optional.of(new Reservation(expiresAt, recipientKey)) : Optional.empty();
    }

    void release(Reservation reservation) {
        jdbc.update("DELETE FROM publication_newsletter_limit WHERE expires_at=? AND bucket_key=?",
                Timestamp.from(reservation.expiresAt()), reservation.recipientKey());
    }

    @Scheduled(fixedDelay = 3600000, initialDelay = 60000)
    public void expire() {
        jdbc.update("DELETE FROM publication_newsletter_limit WHERE expires_at<=?", Timestamp.from(clock.instant()));
    }

    private boolean claim(Timestamp expires, String key, int maximum) {
        return jdbc.update("""
                INSERT INTO publication_newsletter_limit(expires_at,bucket_key,attempts) VALUES (?,?,1)
                ON CONFLICT (expires_at,bucket_key) DO UPDATE
                SET attempts=publication_newsletter_limit.attempts+1
                WHERE publication_newsletter_limit.attempts<?
                """, expires, key, maximum) == 1;
    }

    private String fingerprint(String scope, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            String input = "UP24/newsletter/v1\0" + scope + '\0' + value;
            return HexFormat.of().formatHex(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Newsletter rate protection unavailable.", exception);
        }
    }
}
