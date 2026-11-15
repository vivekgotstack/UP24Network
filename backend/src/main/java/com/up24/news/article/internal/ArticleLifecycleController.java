package com.up24.news.article.internal;

import com.up24.news.article.*;
import com.up24.news.identity.Access;
import com.up24.news.identity.Accounts;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/articles")
@PreAuthorize("@access.hasAny('ADMIN')")
class ArticleLifecycleController {
    record Change(@NotNull @PositiveOrZero Long version,@NotNull ArticleLifecycle.Action action) {}
    record Version(@NotNull @PositiveOrZero Long version) {}
    private final ArticleLifecycle articles;
    private final Access access;
    ArticleLifecycleController(ArticleLifecycle articles, Access access) { this.articles=articles; this.access=access; }

    @GetMapping("/browse") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    ArticleLifecycle.Page browse(@RequestParam(defaultValue="ALL") String status,@RequestParam(defaultValue="") String q,
                                 @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        var actor=access.current();
        // Trashed reports are an administrative area; a reporter only sees assigned reports.
        if (actor.role()!=Accounts.Role.ADMIN && (status.equalsIgnoreCase("TRASH") || status.equalsIgnoreCase("ARCHIVED")))
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN);
        return articles.browse(actor.role()==Accounts.Role.REPORTER?actor.id():null,status,q,page,size);
    }
    @PostMapping("/{id}/lifecycle") ArticleDesk.Managed change(@PathVariable UUID id,@Valid @RequestBody Change input) {
        return articles.change(id,input.version(),input.action(),access.current().id());
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void purge(@PathVariable UUID id,@Valid @RequestBody Version input) { articles.purge(id,input.version(),access.current().id()); }
    @GetMapping("/{id}/revisions") List<ArticleLifecycle.Revision> revisions(@PathVariable UUID id) { return articles.revisions(id); }
    @GetMapping("/{id}/revisions/{version}") ArticleDesk.Managed revision(@PathVariable UUID id,@PathVariable long version) { return articles.revision(id,version); }
    @PostMapping("/{id}/revisions/{version}/restore") ArticleDesk.Managed restore(@PathVariable UUID id,@PathVariable long version,@Valid @RequestBody Version input) {
        return articles.restoreRevision(id,version,input.version(),access.current().id());
    }
    @GetMapping("/{id}/activity") List<ArticleLifecycle.Activity> activity(@PathVariable UUID id) { return articles.activity(id); }
}
