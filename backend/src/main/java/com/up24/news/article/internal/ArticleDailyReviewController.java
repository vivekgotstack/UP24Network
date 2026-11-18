package com.up24.news.article.internal;

import com.up24.news.identity.Access;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/article-reviews/batches")
@PreAuthorize("@access.hasAny('ADMIN')")
class ArticleDailyReviewController {
    record Approve(@NotEmpty List<@NotNull UUID> ids) {}
    record Approval(int count) {}
    record Reward(@NotBlank @Size(min = 12, max = 2000) String note) {}

    private final ArticleDailyReviewService service;
    private final Access access;

    ArticleDailyReviewController(ArticleDailyReviewService service, Access access) {
        this.service = service;
        this.access = access;
    }

    @GetMapping ArticleDailyReviewStore.Page list(@RequestParam(defaultValue = "1") @Min(1) @Max(1000000) int page) {
        return service.list(page);
    }

    @GetMapping("/{contributor}/{day}")
    ArticleDailyReviewStore.Detail detail(@PathVariable UUID contributor,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate day) {
        return service.detail(contributor, day);
    }

    @PostMapping("/{contributor}/{day}/approve")
    Approval approve(@PathVariable UUID contributor, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate day,
                     @Valid @RequestBody Approve request) {
        return new Approval(service.approve(contributor, day, request.ids(), access.current()));
    }

    @PostMapping("/{contributor}/{day}/reward")
    ArticleDailyReviewStore.Batch reward(@PathVariable UUID contributor, @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate day,
                                         @Valid @RequestBody Reward request) {
        return service.recordReward(contributor, day, request.note(), access.current());
    }
}
