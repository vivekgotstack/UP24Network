package com.up24.news.article.internal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class ArticleDailyReviewStore {
    private static final ZoneId EDITION_ZONE = ZoneId.of("Asia/Kolkata");
    private static final int PAGE_SIZE = 20;
    private static final String BATCH_COLUMNS = """
            r.submitter_id, r.review_day, max(r.submitted_by) AS contributor,
            count(*) FILTER (WHERE r.state='PENDING') AS pending_count,
            count(*) FILTER (WHERE r.state='APPROVED') AS approved_count,
            count(*) FILTER (WHERE r.state='RETURNED') AS returned_count,
            d.closed_at, d.rewarded_at, d.reward_note, d.rewarded_count
            """;
    private static final String BATCH_TABLES = """
            FROM article_review_request r LEFT JOIN article_review_batch_decision d
                ON r.submitter_id=d.submitter_id AND r.review_day=d.review_day
            """;
    private static final String GROUP = " GROUP BY r.submitter_id,r.review_day,d.closed_at,d.rewarded_at,d.reward_note,d.rewarded_count ";

    record Batch(UUID contributorId, String contributor, LocalDate day, int pendingCount, int approvedCount,
                 int returnedCount, boolean ready, Instant closedAt, int rewardedCount, Instant rewardedAt, String rewardNote) {}
    record Page(List<Batch> items, boolean hasNext) {}
    record Detail(Batch batch, List<ArticleReview.Summary> items) {}
    private record BatchKey(UUID contributor, LocalDate day) {}

    private final JdbcTemplate jdbc;
    private final Clock clock;

    ArticleDailyReviewStore(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    void lockContributor(UUID contributor) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,26027))", (row, index) -> 1,
                "article-daily-review:" + contributor);
    }

    LocalDate openDay(UUID contributor) {
        LocalDate pending = jdbc.queryForObject("""
                SELECT min(review_day) FROM article_review_request WHERE submitter_id=? AND state='PENDING'
                """, (row, index) -> row.getObject(1, LocalDate.class), contributor);
        if (pending != null) return pending;
        LocalDate closed = jdbc.queryForObject("""
                SELECT max(greatest(review_day, (closed_at AT TIME ZONE 'Asia/Kolkata')::date))
                FROM article_review_batch_decision WHERE submitter_id=?
                """, (row, index) -> row.getObject(1, LocalDate.class), contributor);
        LocalDate today = today();
        return closed == null || closed.isBefore(today) ? today : closed.plusDays(1);
    }

    void closeIfFinished(UUID reviewId, UUID adminId) {
        var key = jdbc.queryForObject("SELECT submitter_id,review_day FROM article_review_request WHERE id=?",
                (row, index) -> new BatchKey(row.getObject(1, UUID.class), row.getObject(2, LocalDate.class)), reviewId);
        if (key != null && pendingIds(key.contributor(), key.day()).isEmpty()) close(key.contributor(), key.day(), adminId);
    }

    void close(UUID contributor, LocalDate day, UUID adminId) {
        jdbc.update("""
                INSERT INTO article_review_batch_decision(submitter_id,review_day,closed_at,closed_by)
                VALUES (?,?,?,?) ON CONFLICT DO NOTHING
                """, contributor, day, Timestamp.from(clock.instant()), adminId);
    }

    Page list(int page) {
        var items = jdbc.query("SELECT " + BATCH_COLUMNS + BATCH_TABLES + GROUP + """
                ORDER BY d.closed_at IS NULL DESC, CASE WHEN d.closed_at IS NULL THEN r.review_day END,
                    r.review_day DESC, r.submitter_id
                LIMIT ? OFFSET ?
                """, this::batch, PAGE_SIZE + 1, (long) (page - 1) * PAGE_SIZE);
        return new Page(List.copyOf(items.subList(0, Math.min(items.size(), PAGE_SIZE))), items.size() > PAGE_SIZE);
    }

    Optional<Batch> batch(UUID contributor, LocalDate day) {
        return jdbc.query("SELECT " + BATCH_COLUMNS + BATCH_TABLES + " WHERE r.submitter_id=? AND r.review_day=? " + GROUP,
                this::batch, contributor, day).stream().findFirst();
    }

    private Batch batch(ResultSet row, int index) throws SQLException {
        LocalDate day = row.getObject("review_day", LocalDate.class);
        Instant closed = instant(row, "closed_at");
        Instant rewarded = instant(row, "rewarded_at");
        int approved = row.getInt("approved_count");
        return new Batch(row.getObject("submitter_id", UUID.class), row.getString("contributor"), day,
                row.getInt("pending_count"), approved, row.getInt("returned_count"), closed == null && !day.isAfter(today()),
                closed, row.getInt("rewarded_count"), rewarded, row.getString("reward_note"));
    }

    List<UUID> pendingIds(UUID contributor, LocalDate day) {
        return jdbc.query("""
                SELECT id FROM article_review_request WHERE submitter_id=? AND review_day=? AND state='PENDING'
                ORDER BY article_id
                """, (row, index) -> row.getObject(1, UUID.class), contributor, day);
    }

    int recordReward(UUID contributor, LocalDate day, UUID adminId, String note, int count) {
        return jdbc.update("""
                UPDATE article_review_batch_decision SET rewarded_at=?,rewarded_by=?,reward_note=?,rewarded_count=?
                WHERE submitter_id=? AND review_day=? AND rewarded_at IS NULL
                """, Timestamp.from(clock.instant()), adminId, note, count, contributor, day);
    }

    private LocalDate today() { return LocalDate.now(clock.withZone(EDITION_ZONE)); }

    private Instant instant(ResultSet row, String column) throws SQLException {
        Timestamp value = row.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
