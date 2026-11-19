package com.up24.news.article.internal;

import com.up24.news.article.ArticleDesk;
import com.up24.news.article.internal.ArticleReview.*;
import com.up24.news.identity.Access;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
class ArticleReviewController {
    private final ArticleReviewService service;
    private final Access access;

    ArticleReviewController(ArticleReviewService service, Access access) {
        this.service = service;
        this.access = access;
    }

    @GetMapping("/articles/{articleId}/review")
    @PreAuthorize("@access.hasAny('EDITOR','REPORTER')")
    StaffHistory history(@PathVariable UUID articleId) { return service.history(articleId, access.current()); }

    @PostMapping("/articles/{articleId}/review")
    @PreAuthorize("@access.hasAny('REPORTER')")
    Summary submit(@PathVariable UUID articleId, @Valid @RequestBody Submission input) {
        return service.submit(articleId, input, access.current());
    }

    @PostMapping("/articles/{articleId}/editor-publication")
    @PreAuthorize("@access.hasAny('EDITOR')")
    ArticleDesk.Managed publishByEditor(@PathVariable UUID articleId, @Valid @RequestBody Submission input) {
        return service.publishByEditor(articleId, input, access.current());
    }

    @GetMapping("/article-reviews")
    @PreAuthorize("@access.hasAny('ADMIN')")
    Page queue(@RequestParam(defaultValue = "PENDING") State state,
               @RequestParam(defaultValue = "1") @Min(1) @Max(100000) int page) {
        return service.page(state, page);
    }

    @GetMapping("/article-reviews/{id}")
    @PreAuthorize("@access.hasAny('ADMIN')")
    Detail detail(@PathVariable UUID id) { return service.detail(id); }

    @PostMapping("/article-reviews/{id}/return")
    @PreAuthorize("@access.hasAny('ADMIN')")
    Summary returnReview(@PathVariable UUID id, @Valid @RequestBody Return input) {
        return service.returnReview(id, input.note(), access.current());
    }
}
