package com.up24.news.article;

import java.util.List;
import java.util.Optional;

/** The Article module's API; its implementation stays in the internal package. */
public interface Articles {
    ArticlePage browse(ArticleQuery query);
    List<ArticleView> published();
    Optional<ArticleView> findPublished(String slug);
}
