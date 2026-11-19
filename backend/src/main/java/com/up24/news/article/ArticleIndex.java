package com.up24.news.article;

import java.time.Instant;
import java.util.List;

/** Lean public discovery contract, independent of article bodies and editorial storage. */
public interface ArticleIndex {
    record Entry(String slug,Instant updatedAt) {}
    record RecentNews(String slug, String title, Instant publishedAt) {}
    record Manifest(long articles,int pages) {}
    Manifest manifest();
    List<Entry> page(int page);
    List<RecentNews> recentNews();
}
