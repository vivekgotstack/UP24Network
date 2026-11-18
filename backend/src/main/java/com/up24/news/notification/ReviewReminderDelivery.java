package com.up24.news.notification;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Durable delivery port for private editorial review reminders. */
public interface ReviewReminderDelivery {
    record Notice(UUID contributorId, LocalDate day, String recipient, String contributor,
                  int pendingCount, URI reviewLink) {}

    boolean configured();
    void enqueue(Notice notice, Instant expiresAt);
}
