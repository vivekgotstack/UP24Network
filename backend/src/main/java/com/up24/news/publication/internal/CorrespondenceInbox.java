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
import java.util.ArrayList;
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
                   boolean resolved, int version, Instant receivedAt, Instant decisionDueAt,
                   Instant resolvedAt, String resolutionNote, boolean preserved) {}

    record Receipt(UUID reference, Instant receivedAt) {}

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
    public Receipt submit(MessageInput input, String address) {
        rejectControlCharacters(input.name(), input.email(), input.subject(), input.message());
        Instant now = clock.instant();
        Instant end = now.truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS);
        Timestamp expiresAt = Timestamp.from(end);
        // Roll back both counters if either limit or the message insert fails.
        if (!claim(expiresAt, addressBucket(address), 6) || !claim(expiresAt, "all", 120)) {
            throw new IntakeLimit(Math.max(1, Duration.between(now, end).toSeconds() + 1));
        }
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO publication_correspondence(id,topic,sender_name,reply_email,subject,message,received_at)
                VALUES (?,?,?,?,?,?,?)
                """, id, input.topic().name(), input.name().strip(), input.email().strip(),
                input.subject().strip(), input.message().strip(), Timestamp.from(now));
        return new Receipt(id, now);
    }

    Page list(boolean openOnly, Topic topic, UUID reference, int page) {
        var filters = new ArrayList<String>();
        var parameters = new ArrayList<Object>();
        if (openOnly) filters.add("NOT resolved");
        if (topic != null) {
            filters.add("topic=?");
            parameters.add(topic.name());
        }
        if (reference != null) {
            filters.add("id=?");
            parameters.add(reference);
        }
        String where = filters.isEmpty() ? "" : " WHERE " + String.join(" AND ", filters);
        String order = openOnly && requiresDecision(topic) ? "received_at,id" : "received_at DESC,id DESC";
        parameters.add(PAGE_SIZE + 1);
        parameters.add((long) (page - 1) * PAGE_SIZE);
        var messages = jdbc.query("""
                SELECT id,topic,sender_name,reply_email,subject,message,resolved,version,received_at,
                       resolved_at,resolution_note,preserved
                FROM publication_correspondence
                """ + where + " ORDER BY " + order + " LIMIT ? OFFSET ?", (row, index) -> {
            Topic messageTopic = Topic.valueOf(row.getString("topic"));
            Instant receivedAt = row.getTimestamp("received_at").toInstant();
            Timestamp resolvedAt = row.getTimestamp("resolved_at");
            return new Message(row.getObject("id", UUID.class), messageTopic, row.getString("sender_name"),
                    row.getString("reply_email"), row.getString("subject"), row.getString("message"),
                    row.getBoolean("resolved"), row.getInt("version"), receivedAt,
                    messageTopic == Topic.COMPLAINT ? receivedAt.plus(15, ChronoUnit.DAYS) : null,
                    resolvedAt == null ? null : resolvedAt.toInstant(), row.getString("resolution_note"),
                    row.getBoolean("preserved"));
        }, parameters.toArray());
        return new Page(List.copyOf(messages.subList(0, Math.min(PAGE_SIZE, messages.size()))), messages.size() > PAGE_SIZE);
    }

    @Transactional
    public void resolve(UUID id, int version, boolean resolved, String resolutionNote) {
        var states = jdbc.query("SELECT topic,resolved FROM publication_correspondence WHERE id=? AND version=? FOR UPDATE",
                (row, index) -> new MessageState(Topic.valueOf(row.getString("topic")), row.getBoolean("resolved")),
                id, version);
        checkChanged(states.size());
        var state = states.getFirst();
        if (state.resolved() == resolved) return;

        String note = resolved && resolutionNote != null ? resolutionNote.strip() : null;
        if (note != null) rejectControlCharacters(note);
        if (resolved && requiresDecision(state.topic()) && (note == null || note.isBlank())) {
            throw new PublicationException(PublicationException.Reason.INVALID_INPUT,
                    "Record the decision communicated to the reader before closing this case.");
        }
        checkChanged(jdbc.update("""
                UPDATE publication_correspondence
                SET resolved=?,resolved_at=?,resolution_note=?,version=version+1 WHERE id=? AND version=?
                """, resolved, resolved ? Timestamp.from(clock.instant()) : null, note, id, version));
    }

    void preserve(UUID id, int version, boolean preserved) {
        checkChanged(jdbc.update("""
                UPDATE publication_correspondence SET preserved=?,version=version+1 WHERE id=? AND version=?
                """, preserved, id, version));
    }

    void delete(UUID id, int version) {
        if (jdbc.update("""
                DELETE FROM publication_correspondence WHERE id=? AND version=? AND NOT preserved
                AND (resolved OR topic NOT IN ('COMPLAINT', 'PRIVACY'))
                """, id, version) != 1) {
            throw new PublicationException(PublicationException.Reason.CONFLICT,
                    "Refresh the inbox. Open complaints, open privacy requests and preserved messages cannot be deleted.");
        }
    }

    @Scheduled(fixedDelay = 3600000, initialDelay = 60000)
    public void expire() {
        Instant now = clock.instant();
        jdbc.update("DELETE FROM publication_correspondence_limit WHERE expires_at <= ?", Timestamp.from(now));
        Timestamp cutoff = Timestamp.from(now.minus(365, ChronoUnit.DAYS));
        jdbc.update("""
                DELETE FROM publication_correspondence WHERE id IN (
                    SELECT id FROM publication_correspondence
                    WHERE received_at < ? AND NOT preserved AND (
                        topic NOT IN ('COMPLAINT', 'PRIVACY') OR
                        (resolved AND (resolved_at IS NULL OR resolved_at < ?))
                    )
                    ORDER BY received_at LIMIT 1000 FOR UPDATE SKIP LOCKED
                )
                """, cutoff, cutoff);
    }

    private record MessageState(Topic topic, boolean resolved) {}

    private static boolean requiresDecision(Topic topic) {
        return topic == Topic.COMPLAINT || topic == Topic.PRIVACY;
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
