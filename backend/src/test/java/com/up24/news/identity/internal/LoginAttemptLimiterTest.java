package com.up24.news.identity.internal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import(JdbcLoginAttemptBuckets.class)
class LoginAttemptLimiterTest {
    @Autowired LoginAttemptBuckets buckets;
    @Test void repeatedPairIsLimitedAndThePersistedWindowResets() {
        var clock=new MutableClock();
        var limiter=new LoginAttemptLimiter(buckets,clock,"1".repeat(64),3,20,Duration.ofMinutes(5));
        for (int attempt=0;attempt<3;attempt++) assertThat(limiter.check(" Staff@limiter.test ","192.0.2.10").allowed()).isTrue();
        var limited=limiter.check("staff@limiter.test","192.0.2.10");
        assertThat(limited.allowed()).isFalse();
        assertThat(limited.retryAfterSeconds()).isEqualTo(300);
        assertThat(limiter.check("staff@limiter.test","192.0.2.11").allowed()).isTrue();
        clock.now=clock.now.plusSeconds(301);
        assertThat(limiter.check("staff@limiter.test","192.0.2.10").allowed()).isTrue();
    }
    private static final class MutableClock extends Clock {
        private Instant now=Instant.parse("2026-11-15T00:00:00Z");
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
