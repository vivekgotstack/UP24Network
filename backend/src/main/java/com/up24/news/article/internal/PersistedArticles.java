package com.up24.news.article.internal;

import com.up24.news.article.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@Profile("!demo")
class PersistedArticles implements Articles {
    private final ArticleDesk desk;
    PersistedArticles(ArticleDesk desk) { this.desk=desk; }
    @Override public List<ArticleView> published() { return desk.published(); }
    @Override public Optional<ArticleView> findPublished(String slug) {
        return desk.published().stream().filter(article->article.slug().equals(slug)).findFirst();
    }
}
