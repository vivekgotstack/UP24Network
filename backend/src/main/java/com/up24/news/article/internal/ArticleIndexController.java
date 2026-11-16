package com.up24.news.article.internal;

import com.up24.news.article.ArticleIndex;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/articles/index")
class ArticleIndexController {
    private final ArticleIndex index;
    ArticleIndexController(ArticleIndex index) { this.index=index; }
    @GetMapping ArticleIndex.Manifest manifest() { return index.manifest(); }
    @GetMapping("/{page}") List<ArticleIndex.Entry> page(@PathVariable int page) {
        if(page<1 || page>index.manifest().pages()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Sitemap page not found.");
        return index.page(page);
    }
}
