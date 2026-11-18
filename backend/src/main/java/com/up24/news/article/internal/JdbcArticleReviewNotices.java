package com.up24.news.article.internal;

import com.up24.news.article.ArticleReviewNotices;
import com.up24.news.identity.Accounts;
import com.up24.news.notification.ReviewReminderDelivery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Service
class JdbcArticleReviewNotices implements ArticleReviewNotices {
    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");
    private final JdbcTemplate jdbc;
    private final Accounts accounts;
    private final ReviewReminderDelivery delivery;
    private final String administrator;
    private final URI reviewLink;

    private record Pending(UUID contributorId, String contributor, int count) {}

    JdbcArticleReviewNotices(JdbcTemplate jdbc, Accounts accounts, ReviewReminderDelivery delivery, Environment environment,
                            @Value("${up24.newsroom.admin-email}") String administrator,
                            @Value("${up24.public-site-url:${SITE_URL:}}") String site) {
        this.jdbc = jdbc;
        this.accounts = accounts;
        this.delivery = delivery;
        this.administrator = administrator.strip();
        this.reviewLink = reviewLink(site.strip(), environment.acceptsProfiles(Profiles.of("local-preview")));
    }

    @Override public boolean configured() { return reviewLink != null && !administrator.isBlank() && delivery.configured(); }

    @Override @Transactional
    public int enqueue(LocalDate day, Instant expiresAt) {
        if (!configured()) return 0;
        String recipient = accounts.find(administrator)
                .filter(account -> account.enabled() && account.role() == Accounts.Role.ADMIN)
                .map(Accounts.Account::email).orElse(null);
        if (recipient == null) return 0;
        var pending = jdbc.query("""
                SELECT submitter_id, max(submitted_by) AS contributor, count(*) AS pending_count
                FROM article_review_request r
                WHERE r.state='PENDING' AND r.review_day<=?
                  AND NOT EXISTS (SELECT 1 FROM article_review_notice n WHERE n.notice_day=? AND n.submitter_id=r.submitter_id)
                GROUP BY submitter_id
                ORDER BY min(review_day),submitter_id
                LIMIT 100
                """, (row, i) -> new Pending(row.getObject("submitter_id", UUID.class), row.getString("contributor"),
                row.getInt("pending_count")), day, day);
        int queued = 0;
        for (Pending item : pending) {
            if (jdbc.update("INSERT INTO article_review_notice(submitter_id,notice_day) VALUES (?,?) ON CONFLICT DO NOTHING",
                    item.contributorId(), day) == 0) continue;
            delivery.enqueue(new ReviewReminderDelivery.Notice(item.contributorId(), day, recipient,
                    item.contributor().replaceAll("\\p{Cntrl}", " "), item.count(), reviewLink), expiresAt);
            queued++;
        }
        return queued;
    }

    private static URI reviewLink(String site, boolean preview) {
        try {
            URI origin = URI.create(site);
            if (origin.getHost() == null || origin.getRawUserInfo() != null || origin.getRawQuery() != null
                    || origin.getRawFragment() != null || !Set.of("", "/").contains(origin.getRawPath())) return null;
            boolean valid = "https".equalsIgnoreCase(origin.getScheme()) || (preview && "http".equalsIgnoreCase(origin.getScheme())
                    && LOOPBACK_HOSTS.contains(origin.getHost()));
            return valid ? origin.resolve("/admin/reviews") : null;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
