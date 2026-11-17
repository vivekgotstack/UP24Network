package com.up24.news.jobs.internal;

import com.fasterxml.jackson.databind.JsonNode;
import com.up24.news.jobs.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties={"up24.jobs.transport=local","up24.jobs.dispatch-ms=3600000","up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email="})
@Import(DurableJobsTest.ProbeConfiguration.class)
@Transactional
class DurableJobsTest {
    static class Probe implements JobHandler {
        final AtomicInteger calls=new AtomicInteger();boolean fail;
        @Override public String type() { return "release.probe.v1"; }
        @Override public void execute(UUID id,JsonNode body) throws Exception {
            calls.incrementAndGet();if(fail) throw new java.io.IOException("temporary failure");
        }
    }
    @TestConfiguration static class ProbeConfiguration { @Bean Probe probe() { return new Probe(); } }
    @Autowired BackgroundJobs jobs;
    @Autowired JobStore store;
    @Autowired JobRunner runner;
    @Autowired JdbcTemplate jdbc;
    @Autowired Probe probe;
    @BeforeEach void reset() { probe.calls.set(0);probe.fail=false; }
    private UUID submit() { return jobs.submit(probe.type(),BackgroundJobs.Lane.MAIL,"probe:"+UUID.randomUUID(),Map.of("code","654321"),Instant.now().plusSeconds(300)); }
    @Test void duplicateDispatchDoesNotRepeatCompletedWorkAndPayloadIsErased() {
        var id=submit();
        assertThat(jdbc.queryForObject("SELECT payload FROM background_job WHERE id=?",byte[].class,id)).doesNotContainSequence("654321".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        runner.run(id);runner.run(id);
        assertThat(probe.calls.get()).isEqualTo(1);
        assertThat(jobs.status(id).state()).isEqualTo("SUCCEEDED");
        assertThat(jdbc.queryForObject("SELECT payload FROM background_job WHERE id=?",byte[].class,id)).isNull();
    }
    @Test void transientFailureBacksOffAndExpiredWorkerLeasesRecover() {
        var id=submit();probe.fail=true;runner.run(id);runner.run(id);
        assertThat(probe.calls.get()).isEqualTo(1);
        assertThat(jobs.status(id).state()).isEqualTo("PENDING");
        jdbc.update("UPDATE background_job SET state='RUNNING',lease_token=?,lease_until=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE id=?",UUID.randomUUID(),id);
        store.maintain();probe.fail=false;runner.run(id);
        assertThat(probe.calls.get()).isEqualTo(2);
        assertThat(jobs.status(id).state()).isEqualTo("SUCCEEDED");
    }
    @Test void expiredCodesNeverExecuteAndFailedPayloadsAreErased() {
        var id=submit();
        jdbc.update("UPDATE background_job SET created_at=CURRENT_TIMESTAMP-INTERVAL '1 hour',expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE id=?",id);
        store.maintain();runner.run(id);
        assertThat(probe.calls.get()).isZero();
        assertThat(jobs.status(id).state()).isEqualTo("FAILED");
        assertThat(jdbc.queryForObject("SELECT payload FROM background_job WHERE id=?",byte[].class,id)).isNull();
    }
}
