package com.up24.news.automation.internal;

import com.up24.news.horoscope.HoroscopeEdition;
import com.up24.news.horoscope.Horoscopes;
import com.up24.news.identity.Accounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.function.Supplier;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"up24.automation.scheduling-enabled=false", "up24.newsroom.owner-email=owner@automation.test", "up24.bootstrap.admin-email=", "up24.providers.astrologics.api-key=al_live_integration_placeholder"})
@AutoConfigureMockMvc
@Transactional
@Import(AutomationIntegrationTest.TestBeans.class)
class AutomationIntegrationTest {
    private static final Instant NOW = Instant.parse("2040-01-01T19:00:00Z");
    private static final LocalDate DAY = LocalDate.of(2040, 1, 2);
    @Autowired AutomationService service;
    @Autowired Horoscopes horoscopes;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired Accounts accounts;
    @Autowired ControlledSource source;
    private String admin;
    private String subscriber;

    @TestConfiguration static class TestBeans {
        @Bean @Primary Clock fixedClock() { return Clock.fixed(NOW, ZoneOffset.UTC); }
        @Bean ControlledSource controlledSource() { return new ControlledSource(); }
    }
    static class ControlledSource implements AutomationSource {
        Supplier<Prepared> fetch = () -> () -> 1;
        @Override public String key() { return "test-source"; }
        @Override public Status status() { return new Status(true, "Test fixture"); }
        @Override public Prepared prepare() { return fetch.get(); }
    }

    @BeforeEach void prepare() {
        admin = "owner@automation.test";
        subscriber = "reader-" + UUID.randomUUID() + "@example.test";
        accounts.create(admin, "Test Admin", "test-password-long-enough", Accounts.Role.ADMIN);
        accounts.create(subscriber, "Test Reader", "test-password-long-enough", Accounts.Role.SUBSCRIBER);
        jdbc.update("INSERT INTO automation_job(job_key,name,interval_minutes) VALUES ('test-source','Test source',15)");
        source.fetch = () -> () -> 1;
    }

    @AfterEach void cleanFixtures() {
        jdbc.update("DELETE FROM horoscope_edition WHERE edition_date IN (?, ?)", DAY, DAY.minusDays(1));
        jdbc.update("DELETE FROM automation_job WHERE job_key='test-source'");
        jdbc.update("DELETE FROM identity_account WHERE email IN (?, ?)", admin, subscriber);
    }

    private org.springframework.mock.web.MockHttpSession verified() {
        var session = new org.springframework.mock.web.MockHttpSession();
        session.setAttribute("up24.newsroom.verified-email",admin);
        session.setAttribute("up24.newsroom.verified-until",Instant.MAX);
        return session;
    }
    private HoroscopeEdition edition(LocalDate day) {
        return new HoroscopeEdition(day, NOW, HoroscopeEdition.SIGN_IDS.stream()
                .map(id -> new HoroscopeEdition.Reading(id, "राशि", "आज का परीक्षण पाठ।", "1", "नीला")).toList());
    }

    @Test void onlyAdminWithCsrfCanChangeVisibilityAndPublicDataContainsNoProviderDetails() throws Exception {
        horoscopes.save(edition(DAY), "internal-provider", "internal-request", "internal-engine");
        mvc.perform(get("/api/horoscope/today")).andExpect(status().isNoContent());
        String settings = "{\"enabled\":true,\"intervalMinutes\":1440}";
        mvc.perform(patch("/api/admin/automations/rashifal").with(user(admin)).session(verified()).contentType("application/json").content(settings))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/automations/rashifal").with(user(subscriber)).with(csrf()).contentType("application/json").content(settings))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/automations/rashifal").with(user(admin)).session(verified()).with(csrf()).contentType("application/json").content(settings))
                .andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(true));
        mvc.perform(get("/api/horoscope/today")).andExpect(status().isOk()).andExpect(jsonPath("$.date").value("2040-01-02"))
                .andExpect(jsonPath("$.signs.length()").value(12)).andExpect(jsonPath("$.provider").doesNotExist())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("internal-"))));
        mvc.perform(patch("/api/admin/automations/rashifal").with(user(admin)).session(verified()).with(csrf()).contentType("application/json")
                .content("{\"enabled\":false,\"intervalMinutes\":1440}")).andExpect(status().isOk());
        mvc.perform(get("/api/horoscope/today")).andExpect(status().isNoContent());
        assertThat(horoscopes.hasEdition(DAY)).isTrue();
    }

    @Test void neverDisplaysYesterdaysEditionAsToday() throws Exception {
        jdbc.update("INSERT INTO horoscope_edition(edition_date,content,provider,provider_request_id,engine_version) VALUES (?,'{}','test','test','test')", DAY.minusDays(1));
        horoscopes.setVisible(true);
        mvc.perform(get("/api/horoscope/today")).andExpect(status().isNoContent());
        assertThatThrownBy(() -> horoscopes.save(edition(DAY.minusDays(1)), "test", "test", "test")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void aCachedEditionAvoidsAnotherProviderCallAndSchedulesAtMidnightIst() {
        horoscopes.save(edition(DAY), "test", "test", "test");
        var job = service.run("rashifal"); // No network request: the day is already stored.
        assertThat(job.failureCount()).isZero();
        assertThat(job.nextRunAt()).isEqualTo(Instant.parse("2040-01-02T18:35:00Z"));
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void aFailedBatchRollsBackAllContentAndSchedulesARetry() {
        source.fetch = () -> () -> {
            horoscopes.save(edition(DAY), "test", "test", "test");
            throw new IllegalStateException("Simulated second-item failure");
        };
        var job = service.run("test-source");
        assertThat(horoscopes.hasEdition(DAY)).isFalse();
        assertThat(job.running()).isFalse();
        assertThat(job.failureCount()).isEqualTo(1);
        assertThat(job.lastResult()).contains("Existing content kept");
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void aWorkerThatLosesItsLeaseCannotPublishOrOverwriteTheNewWorker() {
        source.fetch = () -> {
            jdbc.update("UPDATE automation_job SET lease_token=?,last_result='New worker owns this run' WHERE job_key='test-source'", UUID.randomUUID());
            return () -> { horoscopes.save(edition(DAY), "test", "test", "test"); return 12; };
        };
        var job = service.run("test-source");
        assertThat(horoscopes.hasEdition(DAY)).isFalse();
        assertThat(job.lastResult()).isEqualTo("New worker owns this run");
    }

    @Test void unimplementedProvidersCannotBeEnabled() throws Exception {
        mvc.perform(patch("/api/admin/automations/health").with(user(admin)).session(verified()).with(csrf()).contentType("application/json")
                .content("{\"enabled\":true,\"intervalMinutes\":1440}")).andExpect(status().isConflict());
    }
}
