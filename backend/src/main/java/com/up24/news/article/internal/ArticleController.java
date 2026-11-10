package com.up24.news.article.internal;

import com.up24.news.article.ArticleView;
import com.up24.news.article.Articles;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/articles")
class ArticleController {
    private final Articles articles;

    ArticleController(Articles articles) {
        this.articles = articles;
    }

    @GetMapping
    List<ArticleView> published() {
        return articles.published();
    }

    @GetMapping("/{slug}")
    ArticleView bySlug(@PathVariable String slug) {
        return articles.findPublished(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
    }
}
