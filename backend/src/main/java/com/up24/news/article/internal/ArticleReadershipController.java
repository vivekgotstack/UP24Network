package com.up24.news.article.internal;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.up24.news.identity.Access;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
class ArticleReadershipController {
    private static final int MAX_VIEWS_PER_ADDRESS = 180;

    private final Access access;
    private final ArticleReadership readership;
    // This short-lived abuse guard is separate from the aggregate store. Its
    // address keys are bounded in memory and never written to the analytics DB.
    private final Cache<String, AtomicInteger> bursts = Caffeine.newBuilder()
            .maximumSize(20_000).expireAfterWrite(Duration.ofMinutes(1)).build();

    ArticleReadershipController(Access access, ArticleReadership readership) {
        this.access = access;
        this.readership = readership;
    }

    @PostMapping("/api/articles/{slug}/view") @ResponseStatus(HttpStatus.NO_CONTENT)
    void view(@PathVariable @Size(min = 1, max = 500) String slug, HttpServletRequest request) {
        if (!access.isReaderVisit()) return;
        var counter = bursts.get(request.getRemoteAddr(), address -> new AtomicInteger());
        if (counter.getAndUpdate(count -> Math.min(count + 1, MAX_VIEWS_PER_ADDRESS + 1)) < MAX_VIEWS_PER_ADDRESS)
            readership.record(slug);
    }

    @GetMapping("/api/admin/readership") @PreAuthorize("@access.hasAny('ADMIN')")
    ArticleReadership.Report report(@RequestParam(required = false) @Min(1) @Max(9998) Integer year,
                                    @RequestParam(required = false) @Min(1) @Max(12) Integer month,
                                    @RequestParam(defaultValue = "1") @Min(1) @Max(1000000) int page,
                                    @RequestParam(defaultValue = "") @Size(max = 200) String q) {
        return readership.report(year, month, page, q);
    }
}
