package com.up24.news.publication.internal;

import com.up24.news.publication.PublicationException;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
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
import java.util.List;
import java.util.UUID;

@Service
class CorrespondenceInbox {
    enum Topic { GENERAL, TIP, CORRECTION, COMPLAINT, PRIVACY, ADVERTISING }

    record MessageInput(@NotNull Topic topic, @NotBlank @Size(max = 100) String name,
                        @NotBlank @Email @Size(max = 254) String email,
                        @NotBlank @Size(max = 160) String subject,
                        @NotBlank @Size(max = 4000) String message) {}

    record Message(UUID id, Topic topic, String name, String email, String subject, String message,
                   boolean resolved, int version, Instant receivedAt) {}

    record Page(List<Message> items, boolean hasNext) {}

    static class IntakeLimit extends RuntimeException {
        final long retryAfterSeconds;
        IntakeLimit(long retryAfterSeconds) { this.retryAfterSeconds = retryAfterSeconds; }
    }

    private static final int PAGE_SIZE = 20;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final SecretKeySpec throttleKey;

    CorrespondenceInbox(JdbcTemplate jdbc, Clock clock,
                        @Value("${up24.auth.login-throttle.secret:${up24.newsroom.otp-secret:}}") String secret) {
        this.jdbc = jdbc;
        this.clock = clock;
        throttleKey = new SecretKeySpec(HexFormat.of().parseHex(secret), "HmacSHA256");
    }

    @Transactional
    public void submit(MessageInput input, String address) {
        rejectControlCharacters(input.name(), input.email(), input.subject(), input.message());
        Instant now = clock.instant();
        Instant end = now.truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS);
        Timestamp expiresAt = Timestamp.from(end);
        // Roll back both counters if either limit or the message insert fails.
        if (!claim(expiresAt, addressBucket(address), 6) || !claim(expiresAt, "all", 120)) {
            throw new IntakeLimit(Math.max(1, Duration.between(now, end).toSeconds() + 1));
        }
        jdbc.update("""
                INSERT INTO publication_correspondence(id,topic,sender_name,reply_email,subject,message,received_at)
                VALUES (?,?,?,?,?,?,?)
                """, UUID.randomUUID(), input.topic().name(), input.name().strip(), input.email().strip(),
                input.subject().strip(), input.message().strip(), Timestamp.from(now));
    }

    Page list(boolean openOnly, int page) {
        var messages = jdbc.query("""
                SELECT id,topic,sender_name,reply_email,subject,message,resolved,version,received_at
                FROM publication_correspondence
                """ + (openOnly ? " WHERE NOT resolved " : " ") + "ORDER BY received_at DESC,id DESC LIMIT ? OFFSET ?",
                (row, index) -> new Message(row.getObject("id", UUID.class), Topic.valueOf(row.getString("topic")),
                        row.getString("sender_name"), row.getString("reply_email"), row.getString("subject"),
                        row.getString("message"), row.getBoolean("resolved"), row.getInt("version"),
                        row.getTimestamp("received_at").toInstant()), PAGE_SIZE + 1, (long) (page - 1) * PAGE_SIZE);
        return new Page(List.copyOf(messages.subList(0, Math.min(PAGE_SIZE, messages.size()))), messages.size() > PAGE_SIZE);
    }

    void resolve(UUID id, int version, boolean resolved) {
        checkChanged(jdbc.update("""
                UPDATE publication_correspondence SET resolved=?,version=version+1 WHERE id=? AND version=?
                """, resolved, id, version));
    }

    void delete(UUID id, int version) {
        checkChanged(jdbc.update("DELETE FROM publication_correspondence WHERE id=? AND version=?", id, version));
    }

    @Scheduled(fixedDelay = 3600000, initialDelay = 60000)
    public void expire() {
        Instant now = clock.instant();
        jdbc.update("DELETE FROM publication_correspondence_limit WHERE expires_at <= ?", Timestamp.from(now));
        jdbc.update("""
                DELETE FROM publication_correspondence WHERE id IN (
                    SELECT id FROM publication_correspondence WHERE received_at < ? ORDER BY received_at LIMIT 1000
                )
                """, Timestamp.from(now.minus(365, ChronoUnit.DAYS)));
    }

    private boolean claim(Timestamp expiresAt, String bucket, int limit) {
        return jdbc.update("""
                INSERT INTO publication_correspondence_limit(expires_at,bucket_key,submissions) VALUES (?,?,1)
                ON CONFLICT (expires_at,bucket_key) DO UPDATE
                SET submissions = publication_correspondence_limit.submissions + 1
                WHERE publication_correspondence_limit.submissions < ?
                """, expiresAt, bucket, limit) == 1;
    }

    private String addressBucket(String address) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(throttleKey);
            return HexFormat.of().formatHex(mac.doFinal(("UP24/correspondence/v1\0" + address).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("The correspondence throttle key could not be used.", exception);
        }
    }

    private void rejectControlCharacters(String... fields) {
        for (String field : fields) {
            if (field.codePoints().anyMatch(c -> Character.isISOControl(c) && c != '\n' && c != '\r' && c != '\t')) {
                throw new PublicationException(PublicationException.Reason.INVALID_INPUT, "Please remove unsupported characters from your message.");
            }
        }
    }

    private void checkChanged(int changes) {
        if (changes != 1) throw new PublicationException(PublicationException.Reason.CONFLICT,
                "This message was already updated or removed. Refresh the inbox and try again.");
    }
}
