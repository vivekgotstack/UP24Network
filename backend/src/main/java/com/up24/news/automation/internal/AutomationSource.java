package com.up24.news.automation.internal;

import java.time.Instant;

/** Fetch first; apply the validated batch inside the scheduler's fenced transaction. */
interface AutomationSource {
    String key();
    Status status();
    Prepared prepare();
    default int minIntervalMinutes() { return 5; }
    default int maxIntervalMinutes() { return 10080; }
    default Instant nextRun(Instant now, int intervalMinutes) { return now.plusSeconds(intervalMinutes * 60L); }

    record Status(boolean configured, String detail) {}
    @FunctionalInterface interface Prepared { int publish(); }
}
