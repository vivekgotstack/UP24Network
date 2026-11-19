package com.up24.news.automation.internal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Repository
class CricketScoreboards {
    record Team(String name, String code, String score) {}
    record Match(String id, String status, String note, boolean live, Team home, Team away) {}
    record Observation(long id, boolean completed, Match match) {}
    record Feed(Instant updatedAt, List<Match> matches) {
        static final Feed EMPTY = new Feed(null, List.of());
    }

    private record Row(Instant observedAt, Match match) {}

    private static final Duration FRESHNESS = Duration.ofMinutes(25);
    private static final Duration RESULT_RETENTION = Duration.ofHours(24);
    private static final int MAX_PUBLIC_MATCHES = 4;

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    CricketScoreboards(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    Feed latest(Instant now) {
        var rows = jdbc.query("""
                SELECT observed_at, scorecard
                FROM cricket_score_snapshot
                WHERE observed_at >= ?
                    AND (completed OR observed_at >= ?)
                    AND EXISTS (SELECT 1 FROM automation_job WHERE job_key = 'cricket' AND enabled)
                ORDER BY live DESC, completed ASC, observed_at DESC, match_id DESC
                LIMIT ?
                """, (row, index) -> new Row(row.getTimestamp("observed_at").toInstant(),
                        decode(row.getString("scorecard"))),
                Timestamp.from(now.minus(RESULT_RETENTION)), Timestamp.from(now.minus(FRESHNESS)),
                MAX_PUBLIC_MATCHES);
        if (rows.isEmpty()) return Feed.EMPTY;
        Instant updatedAt = rows.stream().map(Row::observedAt).max(Instant::compareTo).orElseThrow();
        return new Feed(updatedAt, rows.stream().map(Row::match).toList());
    }

    int publish(List<Observation> observations, Instant observedAt) {
        if (!observations.isEmpty()) {
            jdbc.batchUpdate("""
                    INSERT INTO cricket_score_snapshot (match_id, live, completed, observed_at, scorecard)
                    VALUES (?, ?, ?, ?, ?::jsonb)
                    ON CONFLICT (match_id) DO UPDATE
                    SET live = EXCLUDED.live, completed = EXCLUDED.completed,
                        observed_at = EXCLUDED.observed_at, scorecard = EXCLUDED.scorecard
                    """, observations, observations.size(), (statement, observation) -> {
                statement.setLong(1, observation.id());
                statement.setBoolean(2, observation.match().live());
                statement.setBoolean(3, observation.completed());
                statement.setTimestamp(4, Timestamp.from(observedAt));
                statement.setString(5, encode(observation.match()));
            });
        }
        // A match that leaves a successful live feed must not retain a live label.
        jdbc.update("DELETE FROM cricket_score_snapshot WHERE (NOT completed AND observed_at < ?) OR observed_at < ?",
                Timestamp.from(observedAt), Timestamp.from(observedAt.minus(RESULT_RETENTION)));
        return observations.size();
    }

    private Match decode(String scorecard) {
        try {
            return json.readValue(scorecard, Match.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Persisted cricket scorecard is invalid.", exception);
        }
    }

    private String encode(Match scorecard) {
        try {
            return json.writeValueAsString(scorecard);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not store the cricket scorecard.", exception);
        }
    }
}
