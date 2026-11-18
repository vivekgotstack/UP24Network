package com.up24.news.article.internal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.article.ArticleDesk;
import com.up24.news.article.internal.ArticleReview.*;
import com.up24.news.identity.Accounts;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Repository
class ArticleReviewStore {
    record PendingData(Summary summary, UUID submitterId, ArticleDesk.Input input) {}

    private static final String SUMMARY = """
            id, article_id, article_version, kind, state, title, submitted_by, submitted_at,
            change_summary, verification_notes, decision_note, decided_at
            """;
    private static final int PAGE_SIZE = 20;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    ArticleReviewStore(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    private Summary summary(ResultSet row, int index) throws SQLException {
        var decided = row.getTimestamp("decided_at");
        return new Summary(row.getObject("id", UUID.class), row.getObject("article_id", UUID.class),
                row.getLong("article_version"), Kind.valueOf(row.getString("kind")),
                State.valueOf(row.getString("state")), row.getString("title"), row.getString("submitted_by"),
                row.getTimestamp("submitted_at").toInstant(), row.getString("change_summary"),
                row.getString("verification_notes"), row.getString("decision_note"), decided == null ? null : decided.toInstant());
    }

    boolean hasPending(UUID articleId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM article_review_request WHERE article_id=? AND state='PENDING')
                """, Boolean.class, articleId));
    }

    Summary add(UUID articleId, ArticleDesk.Input input, Kind kind, Accounts.Account submitter,
                String changeSummary, String verificationNotes) {
        return Objects.requireNonNull(jdbc.queryForObject("""
                INSERT INTO article_review_request(id,article_id,article_version,kind,title,submitter_id,submitted_by,
                                                  proposed_input,change_summary,verification_notes)
                VALUES(?,?,?,?,?,?,?,?::jsonb,?,?) RETURNING
                """ + SUMMARY, this::summary, UUID.randomUUID(), articleId, input.version(), kind.name(), input.title().strip(),
                submitter.id(), submitter.displayName(), encode(input), changeSummary, verificationNotes));
    }

    StaffHistory history(UUID articleId, UUID submitterId) {
        var entries = jdbc.query("SELECT " + SUMMARY + """
                FROM article_review_request WHERE article_id=? AND submitter_id=?
                ORDER BY submitted_at DESC,id DESC LIMIT 20
                """, this::summary, articleId, submitterId);
        var latest = entries.isEmpty() ? null : entries.getFirst();
        return new StaffHistory(entries, latest != null && latest.state() == State.RETURNED
                ? find(latest.id(), false).map(PendingData::input).orElse(null) : null);
    }

    Page page(State state, int page) {
        var entries = jdbc.query("SELECT " + SUMMARY + """
                FROM article_review_request WHERE state=?
                ORDER BY submitted_at DESC,id DESC LIMIT ? OFFSET ?
                """, this::summary, state.name(), PAGE_SIZE + 1, (long) (page - 1) * PAGE_SIZE);
        return new Page(List.copyOf(entries.subList(0, Math.min(entries.size(), PAGE_SIZE))), entries.size() > PAGE_SIZE);
    }

    Optional<UUID> articleId(UUID id) {
        return jdbc.query("SELECT article_id FROM article_review_request WHERE id=?",
                (row, index) -> row.getObject(1, UUID.class), id).stream().findFirst();
    }

    Optional<PendingData> find(UUID id, boolean lock) {
        return jdbc.query("SELECT " + SUMMARY + ", submitter_id, proposed_input FROM article_review_request WHERE id=?"
                        + (lock ? " FOR UPDATE" : ""),
                (row, index) -> new PendingData(summary(row, index), row.getObject("submitter_id", UUID.class),
                        decode(row.getString("proposed_input"))), id).stream().findFirst();
    }

    Summary decide(UUID id, State state, UUID adminId, String note) {
        return Objects.requireNonNull(jdbc.queryForObject("""
                UPDATE article_review_request SET state=?, decided_by=?, decided_at=CURRENT_TIMESTAMP, decision_note=?
                WHERE id=? AND state='PENDING' RETURNING
                """ + SUMMARY, this::summary, state.name(), adminId, note, id));
    }

    private String encode(ArticleDesk.Input input) {
        try { return json.writeValueAsString(input); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Cannot encode the review proposal", exception); }
    }

    private ArticleDesk.Input decode(String input) throws SQLException {
        try { return json.readValue(input, ArticleDesk.Input.class); }
        catch (JsonProcessingException exception) { throw new SQLException("Invalid review proposal", exception); }
    }
}
