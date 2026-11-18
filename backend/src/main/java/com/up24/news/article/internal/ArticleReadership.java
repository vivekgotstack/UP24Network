package com.up24.news.article.internal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Repository
class ArticleReadership {
    record ArticleViews(UUID id, String slug, String title, long monthViews, long yearViews) {}
    record Report(int year, int month, long monthViews, long yearViews, List<ArticleViews> items, boolean hasNext) {}
    private record Totals(long monthViews, long yearViews) {}

    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final int PAGE_SIZE = 20;

    private final JdbcTemplate jdbc;
    private final Clock clock;

    ArticleReadership(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    void record(String slug) {
        var now = clock.instant();
        jdbc.update("""
                INSERT INTO article_readership_day(article_id,view_day,view_count)
                SELECT a.id,?,1 FROM article_address addr JOIN article_record a ON addr.article_id=a.id
                WHERE addr.slug=? AND a.status='PUBLISHED' AND a.published_at<=?
                ON CONFLICT(article_id,view_day) DO UPDATE SET view_count=article_readership_day.view_count+1
                """, now.atZone(INDIA).toLocalDate(), slug, Timestamp.from(now));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Report report(Integer year, Integer month, int page, String query) {
        var today = LocalDate.now(clock.withZone(INDIA));
        int reportYear = year == null ? today.getYear() : year;
        int reportMonth = month == null ? today.getMonthValue() : month;
        var yearStart = LocalDate.of(reportYear, 1, 1);
        var yearEnd = yearStart.plusYears(1);
        var monthStart = LocalDate.of(reportYear, reportMonth, 1);
        var monthEnd = monthStart.plusMonths(1);
        var totals = jdbc.queryForObject("""
                SELECT COALESCE(sum(view_count) FILTER (WHERE view_day>=? AND view_day<?),0),
                       COALESCE(sum(view_count),0)
                FROM article_readership_day WHERE view_day>=? AND view_day<?
                """, (row, i) -> new Totals(row.getLong(1), row.getLong(2)), monthStart, monthEnd, yearStart, yearEnd);

        String search = query.strip();
        String pattern = "%" + search.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        var rows = jdbc.query("""
                WITH views AS (
                    SELECT article_id, sum(view_count) FILTER (WHERE view_day>=? AND view_day<?) AS month_views,
                           sum(view_count) AS year_views
                    FROM article_readership_day WHERE view_day>=? AND view_day<? GROUP BY article_id
                )
                SELECT a.id,a.slug,a.title,COALESCE(v.month_views,0) AS month_views,COALESCE(v.year_views,0) AS year_views
                FROM article_record a LEFT JOIN views v ON a.id=v.article_id
                WHERE (a.published_at IS NOT NULL OR v.article_id IS NOT NULL) AND
                      (?='' OR a.title ILIKE ? ESCAPE '!' OR a.slug ILIKE ? ESCAPE '!')
                ORDER BY month_views DESC,year_views DESC,a.published_at DESC NULLS LAST,a.id DESC LIMIT ? OFFSET ?
                """, (row, i) -> new ArticleViews(row.getObject("id", UUID.class), row.getString("slug"),
                row.getString("title"), row.getLong("month_views"), row.getLong("year_views")),
                monthStart, monthEnd, yearStart, yearEnd, search, pattern, pattern, PAGE_SIZE + 1, (long) (page - 1) * PAGE_SIZE);
        return new Report(reportYear, reportMonth, totals.monthViews(), totals.yearViews(),
                List.copyOf(rows.subList(0, Math.min(rows.size(), PAGE_SIZE))), rows.size() > PAGE_SIZE);
    }
}
