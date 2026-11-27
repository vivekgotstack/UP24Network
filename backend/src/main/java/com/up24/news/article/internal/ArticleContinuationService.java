package com.up24.news.article.internal;

import com.up24.news.branding.PublicationBrand;
import com.up24.news.article.ArticleDesk;
import com.up24.news.article.ArticleOperationException;
import com.up24.news.identity.Accounts;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

import static com.up24.news.article.ArticleOperationException.Reason.CONFLICT;
import static com.up24.news.article.ArticleOperationException.Reason.NOT_FOUND;

@Service
class ArticleContinuationService {
    private record Source(UUID authorId, UUID rootId, String slug) {}
    private record Edition(String rootSlug, int number) {}

    private final JdbcTemplate jdbc;
    private final ArticleDesk desk;
    private final ArticleLifecycleStore lifecycle;

    ArticleContinuationService(JdbcTemplate jdbc, ArticleDesk desk, ArticleLifecycleStore lifecycle) {
        this.jdbc = jdbc;
        this.desk = desk;
        this.lifecycle = lifecycle;
    }

    @Transactional
    public ArticleDesk.Managed create(UUID sourceId, Accounts.Account actor) {
        var source = jdbc.query("""
                SELECT author_id,continuation_root_id,slug FROM article_record
                WHERE id=? AND status='PUBLISHED' AND published_at<=CURRENT_TIMESTAMP FOR UPDATE
                """, (row, index) -> new Source(row.getObject("author_id", UUID.class),
                row.getObject("continuation_root_id", UUID.class), row.getString("slug")), sourceId)
                .stream().findFirst().orElseThrow(ArticleContinuationService::unavailableSource);
        if (actor.role() == Accounts.Role.REPORTER && !actor.id().equals(source.authorId()))
            throw unavailableSource();

        var rootId = source.rootId() == null ? sourceId : source.rootId();
        var edition = Objects.requireNonNull(jdbc.queryForObject("""
                INSERT INTO article_edition_series(root_id,root_slug,last_edition) VALUES (?,?,2)
                ON CONFLICT (root_id) DO UPDATE SET last_edition=article_edition_series.last_edition+1
                RETURNING root_slug,last_edition
                """, (row, index) -> new Edition(row.getString("root_slug"), row.getInt("last_edition")), rootId, source.slug()));

        UUID id = UUID.randomUUID();
        String byline = actor.role() == Accounts.Role.ADMIN ? PublicationBrand.EDITORIAL_TEAM : actor.displayName();
        try {
            jdbc.update("""
                    INSERT INTO article_record(id,slug,title,summary,category,city,author,author_id,image,image_alt,
                        video_url,youtube_id,reel_url,paragraphs,english_content,region,tags,media_credit,manual_override,edited_by,
                        edition_number,continuation_root_id,continuation_of_id)
                    SELECT ?,?,title,summary,category,city,?,?,image,image_alt,video_url,youtube_id,reel_url,paragraphs,english_content,
                        region,tags,media_credit,TRUE,?,?,?,id FROM article_record WHERE id=?
                    """, id, slug(edition, id), byline, actor.id(), actor.id(), edition.number(), rootId, sourceId);
        } catch (DuplicateKeyException exception) {
            throw new ArticleOperationException(CONFLICT, "The draft address was taken. Try creating the continuation again.");
        }
        lifecycle.record(id, "CREATE_CONTINUATION", actor.id(), 0);
        return desk.find(id).orElseThrow();
    }

    private static String slug(Edition edition, UUID id) {
        String prefix = edition.rootSlug().toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}\\p{M}_-]+", "-");
        String suffix = "-v" + edition.number() + "-" + id.toString().replace("-", "").substring(0, 16);
        int end = Math.min(prefix.length(), 500 - suffix.length());
        if (end > 0 && Character.isHighSurrogate(prefix.charAt(end - 1))) end--;
        return prefix.substring(0, end) + suffix;
    }

    private static ArticleOperationException unavailableSource() {
        return new ArticleOperationException(NOT_FOUND, "The published source article is unavailable.");
    }
}
