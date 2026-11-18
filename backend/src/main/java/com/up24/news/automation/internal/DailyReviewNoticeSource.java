package com.up24.news.automation.internal;

import com.up24.news.article.ArticleReviewNotices;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;

@Component
class DailyReviewNoticeSource implements AutomationSource {
    private static final ZoneId EDITION_ZONE = ZoneId.of("Asia/Kolkata");
    private static final LocalTime START = LocalTime.of(18, 0);
    private final ArticleReviewNotices notices;
    private final Clock clock;

    DailyReviewNoticeSource(ArticleReviewNotices notices, Clock clock) {
        this.notices = notices;
        this.clock = clock;
    }

    @Override public String key() { return "review-notices"; }

    @Override public Status status() {
        boolean configured = notices.configured();
        return new Status(configured, configured ? "One email per contributor per day from 18:00 India time. Approval stays in the private review queue."
                : "Set the public site URL and configure transactional mail to enable review notices.");
    }

    @Override public Prepared prepare() {
        return () -> {
            var now = clock.instant().atZone(EDITION_ZONE);
            if (now.toLocalTime().isBefore(START)) return 0;
            var day = now.toLocalDate();
            return notices.enqueue(day, day.plusDays(1).atStartOfDay(EDITION_ZONE).toInstant());
        };
    }

    @Override public Instant nextRun(Instant instant, int intervalMinutes) {
        var now = instant.atZone(EDITION_ZONE);
        if (now.toLocalTime().isBefore(START)) return now.toLocalDate().atTime(START).atZone(EDITION_ZONE).toInstant();
        var next = now.plusMinutes(intervalMinutes);
        if (next.toLocalDate().equals(now.toLocalDate())) return next.toInstant();
        return next.toLocalDate().atTime(START).atZone(EDITION_ZONE).toInstant();
    }

    @Override public int maxIntervalMinutes() { return 60; }

    @Override public String resultMessage(int count) {
        return count == 0 ? "No new review notices queued." : "Queued " + count + " private review notice(s).";
    }
}
