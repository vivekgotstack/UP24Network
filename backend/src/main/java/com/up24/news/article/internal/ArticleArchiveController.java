package com.up24.news.article.internal;

import com.up24.news.article.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/articles/archive")
class ArticleArchiveController {
    private final ArticleArchive archive;
    ArticleArchiveController(ArticleArchive archive) { this.archive=archive; }
    @GetMapping("/years") List<ArticleArchive.Year> years() { return archive.years(); }
    @GetMapping ArticlePage month(@RequestParam int year,@RequestParam int month,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="12") int size) {
        try { return archive.month(year,month,page,size); }
        catch(IllegalArgumentException exception) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,exception.getMessage()); }
    }
}
