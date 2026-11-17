package com.up24.news.article.internal;

import com.up24.news.article.*;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.*;
import java.util.List;

@Service
class JdbcArticleArchive implements ArticleArchive {
    private static final ZoneId ZONE=ZoneId.of("Asia/Kolkata");
    private final JdbcTemplate jdbc;
    private final Clock clock;
    JdbcArticleArchive(JdbcTemplate jdbc,Clock clock) { this.jdbc=jdbc;this.clock=clock; }
    @Cacheable(cacheNames="article-discovery",key="'archive-years'",condition="@articleCacheInvalidation.readable()")
    @Override public List<Year> years() {
        return jdbc.query("SELECT EXTRACT(YEAR FROM published_at AT TIME ZONE 'Asia/Kolkata')::integer AS year,count(*) AS articles FROM article_record WHERE status='PUBLISHED' AND published_at<=CURRENT_TIMESTAMP GROUP BY year ORDER BY year DESC",
                (row,index)->new Year(row.getInt("year"),row.getLong("articles")));
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    @Cacheable(cacheNames="article-discovery",key="'archive-' + #year + '-' + #month + '-' + #page + '-' + #size",condition="@articleCacheInvalidation.readable()")
    @Override public ArticlePage month(int year,int month,int page,int size) {
        int currentYear=clock.instant().atZone(ZONE).getYear();
        if(year<1850 || year>currentYear || month<1 || month>12 || page<1 || page>100000 || size<1 || size>48)
            throw new IllegalArgumentException("Choose a valid year, month and bounded page size.");
        var start=LocalDate.of(year,month,1).atStartOfDay(ZONE);
        var from=Timestamp.from(start.toInstant());var until=Timestamp.from(start.plusMonths(1).toInstant());
        var where=" FROM article_record WHERE status='PUBLISHED' AND published_at>=? AND published_at<? AND published_at<=CURRENT_TIMESTAMP";
        long total=jdbc.queryForObject("SELECT count(*)"+where,Long.class,from,until);
        int pages=ArticlePage.pages(total,size),current=Math.min(page,pages);
        var items=jdbc.query("SELECT "+ArticleStore.SUMMARY_COLUMNS+where+" ORDER BY published_at DESC,id DESC LIMIT ? OFFSET ?",
                (row,index)->ArticleRows.summary(row).article(),from,until,size,(long)(current-1)*size);
        return new ArticlePage(items,total,current,size,pages);
    }
}
