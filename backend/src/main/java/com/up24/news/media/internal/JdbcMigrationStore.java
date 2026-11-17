package com.up24.news.media.internal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
class JdbcMigrationStore implements MigrationStore {
    private static final RowMapper<Run> RUN=(row,index)->new Run(row.getObject("migration_run_id",UUID.class),row.getObject("migration_job_id",UUID.class),
            instant(row.getTimestamp("migration_started_at")),instant(row.getTimestamp("migration_completed_at")),row.getLong("migration_moved"),
            row.getString("migration_error"),row.getString("migration_bucket"),row.getString("migration_prefix"));
    private final JdbcTemplate jdbc;
    JdbcMigrationStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    private static Instant instant(Timestamp value) { return value==null?null:value.toInstant(); }
    @Override public Run read() { return jdbc.queryForObject("SELECT * FROM media_retention_policy WHERE id=1",RUN); }
    @Override public Run lock() { return jdbc.queryForObject("SELECT * FROM media_retention_policy WHERE id=1 FOR UPDATE",RUN); }
    @Override public void begin(UUID runId,UUID jobId,String bucket,String prefix) {
        jdbc.update("UPDATE media_retention_policy SET migration_run_id=?,migration_job_id=?,migration_started_at=CURRENT_TIMESTAMP,migration_completed_at=NULL,migration_moved=0,migration_error=NULL,migration_bucket=?,migration_prefix=? WHERE id=1",runId,jobId,bucket,prefix);
    }
    @Override public void advance(UUID runId,UUID currentJobId,UUID nextJobId) {
        jdbc.update("UPDATE media_retention_policy SET migration_job_id=?,migration_error=NULL WHERE id=1 AND migration_run_id=? AND migration_job_id=?",nextJobId,runId,currentJobId);
    }
    @Override public void moved(UUID runId) {
        jdbc.update("UPDATE media_retention_policy SET migration_moved=migration_moved+1,migration_error=NULL WHERE id=1 AND migration_run_id=?",runId);
    }
    @Override public void complete(UUID runId,UUID currentJobId) {
        jdbc.update("UPDATE media_retention_policy SET migration_completed_at=CURRENT_TIMESTAMP,migration_error=NULL WHERE id=1 AND migration_run_id=? AND migration_job_id=?",runId,currentJobId);
    }
    @Override public void error(UUID runId,UUID jobId,String message) {
        jdbc.update("UPDATE media_retention_policy SET migration_error=? WHERE id=1 AND migration_run_id=? AND migration_job_id=?",message,runId,jobId);
    }
    @Override public boolean reserve(Copy copy) {
        var location=copy.destination();
        return jdbc.update("INSERT INTO media_copy_reservation(asset_id,token,storage_backend,storage_bucket,object_key,bytes,expires_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(asset_id) DO NOTHING",
                copy.assetId(),copy.token(),location.backend(),location.bucket(),location.key(),copy.bytes(),Timestamp.from(copy.expiresAt()))==1;
    }
    @Override public boolean owns(Copy copy) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM media_copy_reservation WHERE asset_id=? AND token=? AND expires_at>CURRENT_TIMESTAMP)",Boolean.class,copy.assetId(),copy.token()));
    }
    @Override public boolean release(Copy copy) { return jdbc.update("DELETE FROM media_copy_reservation WHERE asset_id=? AND token=?",copy.assetId(),copy.token())==1; }
    @Override public List<Copy> expired() {
        return jdbc.query("SELECT * FROM media_copy_reservation WHERE expires_at<=CURRENT_TIMESTAMP ORDER BY expires_at LIMIT 20",(row,index)->new Copy(row.getString("asset_id"),row.getObject("token",UUID.class),
                new StorageLocation(row.getString("storage_backend"),row.getString("storage_bucket"),row.getString("object_key")),row.getInt("bytes"),row.getTimestamp("expires_at").toInstant()));
    }
}
