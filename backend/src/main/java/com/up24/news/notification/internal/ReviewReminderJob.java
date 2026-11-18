package com.up24.news.notification.internal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.jobs.BackgroundJobs;
import com.up24.news.jobs.JobHandler;
import com.up24.news.jobs.PermanentJobFailure;
import com.up24.news.notification.ReviewReminderDelivery;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;
import java.util.UUID;

@Component
class ReviewReminderJob implements ReviewReminderDelivery, JobHandler {
    private static final String TYPE = "editorial-review-reminder.v1";
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG)
            .withLocale(Locale.forLanguageTag("en-IN"));
    private final BackgroundJobs jobs;
    private final MailTransport transport;
    private final ObjectMapper json;
    private final boolean preview;

    ReviewReminderJob(BackgroundJobs jobs, MailTransport transport, ObjectMapper json, Environment environment) {
        this.jobs = jobs;
        this.transport = transport;
        this.json = json;
        this.preview = environment.acceptsProfiles(Profiles.of("local-preview"));
    }

    @Override public boolean configured() { return preview || transport.configured(); }

    @Override public void enqueue(Notice notice, Instant expiresAt) {
        jobs.submit(TYPE, BackgroundJobs.Lane.MAIL, "review-reminder:" + notice.contributorId() + ":" + notice.day(),
                notice, expiresAt);
    }

    @Override public String type() { return TYPE; }

    @Override public void execute(UUID id, JsonNode payload) throws Exception {
        Notice notice = json.treeToValue(payload, Notice.class);
        if (notice.recipient() == null || notice.day() == null || notice.contributor() == null
                || notice.pendingCount() < 1 || notice.reviewLink() == null) throw new PermanentJobFailure();
        String subject = "UP24Network daily editorial review";
        boolean single = notice.pendingCount() == 1;
        String body = notice.pendingCount() + (single ? " contribution from " : " contributions from ") + notice.contributor()
                + (single ? " needs" : " need") + " editorial review as of " + DATE.format(notice.day()) + " (India time).\n\n"
                + "Open the private review queue to check the current batch and decide which items to approve.\n"
                + notice.reviewLink().toASCIIString() + "\n\nYou’ll need to sign in as the administrator.";
        if (preview) {
            Path mailbox = Path.of(".local", "preview-mailbox");
            Files.createDirectories(mailbox);
            Files.writeString(mailbox.resolve("review-notice-" + id + ".txt"),
                    "To: " + notice.recipient() + "\nSubject: " + subject + "\n\n" + body + "\n\nLocal preview only.");
        } else {
            transport.deliver(id, new MailMessage(notice.recipient(), subject, body, "editorial-review"));
        }
    }
}
