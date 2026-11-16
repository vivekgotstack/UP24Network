package com.up24.news.jobs.internal;

import com.up24.news.jobs.BackgroundJobs;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Repository
class JdbcJobStore implements JobStore {
    private final JdbcTemplate jdbc;
    JdbcJobStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Transactional @Override public UUID insert(UUID id,String type,BackgroundJobs.Lane lane,String dedup,byte[] payload,Instant expires) {
        var existing=jdbc.query("SELECT id FROM background_job WHERE dedup_key=?",(row,index)->row.getObject(1,UUID.class),dedup);
        if(!existing.isEmpty()) return existing.getFirst();
        jdbc.execute("SELECT pg_advisory_xact_lock(8524,1901)");
        if(jdbc.queryForObject("SELECT count(*) FROM background_job WHERE state IN ('PENDING','DISPATCHED','RUNNING')",Long.class)>=10000)
            throw new IllegalStateException("The background queue is full. Please retry shortly.");
        jdbc.update("INSERT INTO background_job(id,dedup_key,job_type,lane,payload,expires_at) VALUES (?,?,?,?,?,?) ON CONFLICT(dedup_key) DO NOTHING",id,dedup,type,lane.name(),payload,Timestamp.from(expires));
        return jdbc.queryForObject("SELECT id FROM background_job WHERE dedup_key=?",UUID.class,dedup);
    }
    @Override public Optional<BackgroundJobs.Status> status(UUID id) {
        return jdbc.query("SELECT id,job_type,state,attempts,last_error FROM background_job WHERE id=?",(row,index)->new BackgroundJobs.Status(row.getObject(1,UUID.class),row.getString(2),row.getString(3),row.getInt(4),row.getString(5)),id).stream().findFirst();
    }
    @Transactional @Override public List<Dispatch> dispatch() {
        var lease=UUID.randomUUID();
        return jdbc.query("""
                WITH due AS (SELECT id FROM background_job WHERE state IN ('PENDING','DISPATCHED') AND next_attempt_at<=CURRENT_TIMESTAMP
                  AND expires_at>CURRENT_TIMESTAMP AND (lease_until IS NULL OR lease_until<=CURRENT_TIMESTAMP)
                  ORDER BY CASE WHEN lane='MAIL' THEN 0 ELSE 1 END,next_attempt_at LIMIT 8 FOR UPDATE SKIP LOCKED)
                UPDATE background_job j SET state='DISPATCHED',lease_token=?,lease_until=CURRENT_TIMESTAMP+INTERVAL '90 seconds',next_attempt_at=CURRENT_TIMESTAMP+INTERVAL '90 seconds'
                FROM due WHERE j.id=due.id RETURNING j.id,j.lane,j.expires_at
                """,(row,index)->new Dispatch(row.getObject(1,UUID.class),BackgroundJobs.Lane.valueOf(row.getString(2)),row.getTimestamp(3).toInstant(),lease),lease);
    }
    @Override public void published(Dispatch job) {
        jdbc.update("UPDATE background_job SET lease_token=NULL,lease_until=NULL WHERE id=? AND state='DISPATCHED' AND lease_token=?",job.id(),job.lease());
    }
    @Override public void publicationFailed(Dispatch job) {
        jdbc.update("UPDATE background_job SET state='PENDING',lease_token=NULL,lease_until=NULL,next_attempt_at=CURRENT_TIMESTAMP+INTERVAL '15 seconds' WHERE id=? AND state='DISPATCHED' AND lease_token=?",job.id(),job.lease());
    }
    @Override public Optional<Work> start(UUID id) {
        var lease=UUID.randomUUID();
        return jdbc.query("UPDATE background_job SET state='RUNNING',attempts=attempts+1,lease_token=?,lease_until=CURRENT_TIMESTAMP+INTERVAL '3 minutes' WHERE id=? AND state IN ('PENDING','DISPATCHED') AND (state='DISPATCHED' OR next_attempt_at<=CURRENT_TIMESTAMP) AND attempts<5 AND expires_at>CURRENT_TIMESTAMP RETURNING job_type,payload",
                (row,index)->new Work(id,row.getString(1),row.getBytes(2),lease),lease,id).stream().findFirst();
    }
    @Override public void finish(Work job) {
        jdbc.update("UPDATE background_job SET state='SUCCEEDED',payload=NULL,last_error=NULL,completed_at=CURRENT_TIMESTAMP,lease_token=NULL,lease_until=NULL WHERE id=? AND state='RUNNING' AND lease_token=?",job.id(),job.lease());
    }
    @Override public void fail(Work job,boolean permanent) {
        jdbc.update("""
                UPDATE background_job SET state=CASE WHEN ? OR attempts>=5 OR expires_at<=CURRENT_TIMESTAMP THEN 'FAILED' ELSE 'PENDING' END,
                  payload=CASE WHEN ? OR attempts>=5 OR expires_at<=CURRENT_TIMESTAMP THEN NULL ELSE payload END,
                  last_error='The job could not be completed. Check service configuration or retry the operation.',lease_token=NULL,lease_until=NULL,
                  next_attempt_at=CURRENT_TIMESTAMP+make_interval(secs=>LEAST(300,10*power(2,attempts))::double precision)
                WHERE id=? AND state='RUNNING' AND lease_token=?
                """,permanent,permanent,job.id(),job.lease());
    }
    @Override public void heartbeat(UUID id,UUID lease) {
        jdbc.update("UPDATE background_job SET lease_until=CURRENT_TIMESTAMP+INTERVAL '3 minutes' WHERE id=? AND state='RUNNING' AND lease_token=?",id,lease);
    }
    @Override public void maintain() {
        jdbc.update("UPDATE background_job SET state='PENDING',lease_token=NULL,lease_until=NULL,next_attempt_at=CURRENT_TIMESTAMP WHERE state='RUNNING' AND lease_until<CURRENT_TIMESTAMP AND attempts<5 AND expires_at>CURRENT_TIMESTAMP");
        jdbc.update("UPDATE background_job SET state='FAILED',payload=NULL,lease_token=NULL,lease_until=NULL,last_error='The job expired or exhausted its retry allowance.' WHERE state IN ('PENDING','DISPATCHED','RUNNING') AND (expires_at<=CURRENT_TIMESTAMP OR (attempts>=5 AND (lease_until IS NULL OR lease_until<CURRENT_TIMESTAMP)))");
        jdbc.update("DELETE FROM background_job WHERE id IN (SELECT id FROM background_job WHERE state IN ('SUCCEEDED','FAILED') AND expires_at<CURRENT_TIMESTAMP-INTERVAL '30 days' ORDER BY expires_at LIMIT 250)");
    }
    @Override public Map<String,Long> counts() {
        var counts=new LinkedHashMap<String,Long>();
        jdbc.query("SELECT state,count(*) FROM background_job GROUP BY state",row->{counts.put(row.getString(1),row.getLong(2));});
        return counts;
    }
}
