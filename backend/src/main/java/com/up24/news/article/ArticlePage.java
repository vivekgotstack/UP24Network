package com.up24.news.article;

import java.util.List;

public record ArticlePage(List<ArticleView> items, long total, int page, int size, int pages) {
    public ArticlePage { items = List.copyOf(items); }
    public static int pages(long total, int size) { return Math.max(1, (int) Math.ceil((double) total / size)); }
}
