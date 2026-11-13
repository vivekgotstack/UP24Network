package com.up24.news.article.internal;

import com.up24.news.article.ArticleDesk;
import com.up24.news.identity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/admin/articles")
@PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
class EditorialController {
    record Publication(@NotNull @PositiveOrZero Long version,@NotNull Boolean published,@NotNull Boolean breaking) {}
    private final ArticleDesk desk;
    private final Access access;
    EditorialController(ArticleDesk desk,Access access) { this.desk=desk; this.access=access; }
    @GetMapping List<ArticleDesk.Managed> list() {
        var actor=access.current();
        return desk.list(actor.role()==Accounts.Role.REPORTER?actor.id():null);
    }
    @PostMapping ArticleDesk.Managed create(@Valid @RequestBody ArticleDesk.Input input) {
        var actor=access.current();
        requirements(actor,input);
        return desk.save(null,input,actor.id(),actor.role()==Accounts.Role.ADMIN?"UP24Network Editorial Team":actor.displayName());
    }
    private void requirements(Accounts.Account actor,ArticleDesk.Input input) {
        if(actor.role()!=Accounts.Role.ADMIN) ReportingRequirements.check(input.city(),input.image(),input.imageAlt(),input.videoUrl(),input.youtubeId(),input.sourceNotes());
    }
    @GetMapping("/{id}") ArticleDesk.Managed find(@PathVariable UUID id) {
        var actor=access.current();
        var article=desk.find(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(actor.role()==Accounts.Role.REPORTER && !actor.id().equals(article.authorId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return article;
    }
    @PutMapping("/{id}") ArticleDesk.Managed update(@PathVariable UUID id,@Valid @RequestBody ArticleDesk.Input input) {
        var actor=access.current(); var existing=desk.find(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(actor.role()==Accounts.Role.REPORTER && (!actor.id().equals(existing.authorId()) || !existing.status().equals("DRAFT")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        requirements(actor,input);
        return desk.save(id,input,actor.id(),actor.displayName());
    }
    @PostMapping("/{id}/publication") @PreAuthorize("@access.hasAny('ADMIN','EDITOR')") ArticleDesk.Managed publish(@PathVariable UUID id,@Valid @RequestBody Publication input) {
        if(input.published() && access.current().role()!=Accounts.Role.ADMIN) {
            var managed=desk.find(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
            var article=managed.article();
            ReportingRequirements.check(article.city(),article.image(),article.imageAlt(),article.videoUrl(),article.youtubeId(),managed.sourceNotes());
        }
        return desk.publish(id,input.version(),input.published(),input.breaking());
    }
}
