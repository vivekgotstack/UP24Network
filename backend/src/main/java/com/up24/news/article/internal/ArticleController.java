package com.up24.news.article.internal;

import com.up24.news.article.ArticleView;
import com.up24.news.article.Articles;
import com.up24.news.article.ArticlePage;
import com.up24.news.article.ArticleQuery;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
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

    @GetMapping("/browse")
    ArticlePage browse(@RequestParam(required = false) List<String> category,
                       @RequestParam(required = false) List<String> city,
                       @RequestParam(defaultValue = "") String region,
                       @RequestParam(defaultValue = "") String q,
                       @RequestParam(defaultValue = "false") boolean videoOnly,
                       @RequestParam(defaultValue = "1") int page,
                       @RequestParam(defaultValue = "12") int size) {
        try { return articles.browse(new ArticleQuery(category, city, region, q, videoOnly, page, size)); }
        catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }
}
