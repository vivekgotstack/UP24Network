package com.up24.news.article;

/** Media deletion checks current reports and retained revision snapshots. */
public interface ArticleMediaUsage { boolean inUse(String url); }
