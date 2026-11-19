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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/articles")
@PreAuthorize("@access.hasAny('ADMIN')")
class ArticleLifecycleController {
    record Change(@NotNull @PositiveOrZero Long version,@NotNull ArticleLifecycle.Action action) {}
    record Version(@NotNull @PositiveOrZero Long version) {}
    record Actor(String name, Accounts.Role role) {}
    record RevisionAttribution(@com.fasterxml.jackson.annotation.JsonUnwrapped ArticleLifecycle.Revision revision, Actor actor) {}
    record ActivityAttribution(@com.fasterxml.jackson.annotation.JsonUnwrapped ArticleLifecycle.Activity activity, Actor actor) {}
    private final ArticleLifecycle articles;
    private final Access access;
    private final Accounts accounts;
    ArticleLifecycleController(ArticleLifecycle articles, Access access, Accounts accounts) {
        this.articles=articles; this.access=access; this.accounts=accounts;
    }

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
    @GetMapping("/{id}/revisions") List<RevisionAttribution> revisions(@PathVariable UUID id) {
        Map<UUID, Optional<Actor>> actors = new HashMap<>();
        return articles.revisions(id).stream()
                .map(row -> new RevisionAttribution(row, actor(row.actorId(), actors))).toList();
    }
    @GetMapping("/{id}/revisions/{version}") ArticleDesk.Managed revision(@PathVariable UUID id,@PathVariable long version) { return articles.revision(id,version); }
    @PostMapping("/{id}/revisions/{version}/restore") ArticleDesk.Managed restore(@PathVariable UUID id,@PathVariable long version,@Valid @RequestBody Version input) {
        return articles.restoreRevision(id,version,input.version(),access.current().id());
    }
    @GetMapping("/{id}/activity") List<ActivityAttribution> activity(@PathVariable UUID id) {
        Map<UUID, Optional<Actor>> actors = new HashMap<>();
        return articles.activity(id).stream()
                .map(row -> new ActivityAttribution(row, actor(row.actorId(), actors))).toList();
    }

    private Actor actor(UUID id, Map<UUID, Optional<Actor>> cache) {
        return id == null ? null : cache.computeIfAbsent(id, key ->
                accounts.find(key).map(account -> new Actor(account.displayName(), account.role()))).orElse(null);
    }
}
