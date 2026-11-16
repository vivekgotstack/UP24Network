package com.up24.news.media.internal;

import com.up24.news.media.MediaRetention;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Repository
class JdbcRetentionStore implements RetentionStore {
    private static final RowMapper<MediaRetention.Policy> POLICY=(row,index) -> {
        var appliedAt=row.getTimestamp("applied_at");
        return new MediaRetention.Policy(row.getBoolean("enabled"),row.getInt("transition_days"),row.getLong("version"),
                row.getObject("applied_version",Long.class),appliedAt==null?null:appliedAt.toInstant(),row.getString("last_error"));
    };
    private final JdbcTemplate jdbc;
    JdbcRetentionStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Override public MediaRetention.Policy policy() { return jdbc.queryForObject("SELECT * FROM media_retention_policy WHERE id=1",POLICY); }
    @Override public Counts counts() {
        return jdbc.queryForObject("SELECT count(*) FILTER(WHERE storage_backend='LOCAL') AS local,count(*) FILTER(WHERE storage_backend='S3') AS s3,(SELECT count(*) FROM media_pending_deletion) AS deletions FROM media_asset",
                (row,index) -> new Counts(row.getLong("local"),row.getLong("s3"),row.getLong("deletions")));
    }
    @Override public boolean save(MediaRetention.Input input) {
        return jdbc.update("UPDATE media_retention_policy SET enabled=?,transition_days=?,version=version+1,updated_at=CURRENT_TIMESTAMP,last_error=NULL,next_attempt_at=CURRENT_TIMESTAMP WHERE id=1 AND version=?",
                input.enabled(),input.transitionDays(),input.version())==1;
    }
    @Transactional @Override public Optional<Claim> claim(boolean force) {
        var token=UUID.randomUUID();
        return jdbc.query("""
                UPDATE media_retention_policy SET lease_token=?,lease_until=CURRENT_TIMESTAMP+INTERVAL '2 minutes'
                WHERE id=1 AND (lease_until IS NULL OR lease_until<CURRENT_TIMESTAMP)
                  AND (? OR (applied_version IS DISTINCT FROM version AND next_attempt_at<=CURRENT_TIMESTAMP AND (version>0 OR enabled)))
                RETURNING *
                """,(row,index) -> new Claim(token,POLICY.mapRow(row,index)),token,force).stream().findFirst();
    }
    @Override public void applied(Claim claim) {
        jdbc.update("UPDATE media_retention_policy SET applied_version=?,applied_at=CURRENT_TIMESTAMP,last_error=NULL,lease_token=NULL,lease_until=NULL WHERE id=1 AND lease_token=?",
                claim.policy().version(),claim.token());
    }
    @Override public void failed(Claim claim) {
        jdbc.update("UPDATE media_retention_policy SET last_error='AWS retention could not be applied. Check the bucket and IAM permissions.',next_attempt_at=CURRENT_TIMESTAMP+INTERVAL '5 minutes',lease_token=NULL,lease_until=NULL WHERE id=1 AND lease_token=?",claim.token());
    }
}
