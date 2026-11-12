package com.up24.news.automation.internal;

import com.up24.news.horoscope.Horoscopes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
class AutomationService {
    record Job(String key, String name, boolean enabled, int intervalMinutes, Instant nextRunAt,
               Instant lastRunAt, String lastResult, boolean running, boolean configured, String configurationDetail, int failureCount) {}
    private static final Logger log = LoggerFactory.getLogger(AutomationService.class);
    private final JdbcTemplate jdbc;
    private final Horoscopes horoscopes;
    private final Map<String, AutomationSource> sources;
    private final TransactionTemplate transaction;
    private final Clock clock;

    AutomationService(JdbcTemplate jdbc, Horoscopes horoscopes, List<AutomationSource> sources,
                      PlatformTransactionManager transactions, Clock clock) {
        this.jdbc = jdbc;
        this.horoscopes = horoscopes;
        this.sources = sources.stream().collect(Collectors.toUnmodifiableMap(AutomationSource::key, Function.identity()));
        this.transaction = new TransactionTemplate(transactions);
        this.clock = clock;
    }

    List<Job> list() {
        return jdbc.query("SELECT * FROM automation_job ORDER BY job_key", (row, index) -> {
            AutomationSource source = sources.get(row.getString("job_key"));
            var status = source == null ? new AutomationSource.Status(false, "Provider integration is not installed yet.") : source.status();
            Timestamp lastRun = row.getTimestamp("last_run_at");
            return new Job(row.getString("job_key"), row.getString("name"), row.getBoolean("enabled"), row.getInt("interval_minutes"),
                    row.getTimestamp("next_run_at").toInstant(), lastRun == null ? null : lastRun.toInstant(),
                    row.getString("last_result"), row.getBoolean("running"), status.configured(), status.detail(), row.getInt("failure_count"));
        });
    }

    private Job job(String key) {
        return list().stream().filter(job -> job.key().equals(key)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    Job update(String key, boolean enabled, int minutes) {
        Job existing = job(key);
        if (minutes < 5 || minutes > 10080) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an interval between 5 minutes and 7 days");
        if (enabled && !existing.configured()) throw new ResponseStatusException(HttpStatus.CONFLICT, existing.configurationDetail());
        transaction.executeWithoutResult(status -> {
            jdbc.update("UPDATE automation_job SET enabled=?, interval_minutes=?, next_run_at=CURRENT_TIMESTAMP WHERE job_key=?", enabled, minutes, key);
            if (key.equals("rashifal")) horoscopes.setVisible(enabled);
        });
        return job(key);
    }

    Job run(String key) {
        Job existing = job(key);
        if (!existing.configured()) throw new ResponseStatusException(HttpStatus.CONFLICT, existing.configurationDetail());
        UUID lease = UUID.randomUUID();
        if (jdbc.update("""
                UPDATE automation_job SET running=TRUE, lease_token=?, last_run_at=CURRENT_TIMESTAMP
                WHERE job_key=? AND (NOT running OR last_run_at<CURRENT_TIMESTAMP-INTERVAL '15 minutes')
                """, lease, key) == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "This import is already running");
        AutomationSource source = sources.get(key);
        try {
            // External I/O happens without holding a database transaction or row lock.
            AutomationSource.Prepared batch = source.prepare();
            transaction.executeWithoutResult(status -> {
                List<UUID> tokens = jdbc.query("SELECT lease_token FROM automation_job WHERE job_key=? FOR UPDATE",
                        (row, index) -> row.getObject(1, UUID.class), key);
                if (tokens.isEmpty() || !Objects.equals(lease, tokens.getFirst())) return;
                int count = batch.publish();
                int interval = Objects.requireNonNull(jdbc.queryForObject("SELECT interval_minutes FROM automation_job WHERE job_key=?", Integer.class, key));
                jdbc.update("""
                        UPDATE automation_job SET running=FALSE, lease_token=NULL, failure_count=0, last_result=?, next_run_at=? WHERE job_key=?
                        """, count == 0 ? "Source checked. Existing edition kept." : "Refreshed " + count + " source items.",
                        Timestamp.from(source.nextRun(clock.instant(), interval)), key);
            });
        } catch (Exception exception) {
            String result = exception instanceof RestClientResponseException response && response.getStatusCode().value() == 401
                    ? "Provider rejected the key. Check local configuration. Existing content kept."
                    : exception instanceof RestClientResponseException response && response.getStatusCode().value() == 429
                    ? "Provider quota or rate limit reached. Existing content kept; a retry is scheduled."
                    : "Source unavailable or invalid. Existing content kept; a retry is scheduled.";
            // Never log provider bodies, authorization headers or secret-bearing exception messages.
            log.warn("Automation {} failed ({})", key, exception.getClass().getSimpleName());
            jdbc.update("""
                    UPDATE automation_job SET running=FALSE, lease_token=NULL, failure_count=failure_count+1, last_result=?,
                    next_run_at=CURRENT_TIMESTAMP + LEAST(interval_minutes, 5 * POWER(2, LEAST(failure_count, 6))) * INTERVAL '1 minute'
                    WHERE job_key=? AND lease_token=?
                    """, result, key, lease);
        }
        return job(key);
    }

    void runDue() {
        Instant now = clock.instant();
        for (Job job : list()) {
            if (job.enabled() && job.configured() && !job.nextRunAt().isAfter(now)
                    && (!job.running() || job.lastRunAt() != null && job.lastRunAt().isBefore(now.minusSeconds(900)))) {
                try { run(job.key()); }
                catch (ResponseStatusException exception) {
                    if (exception.getStatusCode() != HttpStatus.CONFLICT) throw exception;
                }
            }
        }
    }
}
