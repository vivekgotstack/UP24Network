package com.up24.news.article.internal;

import com.up24.news.PublicationBrand;
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
    private final ArticleReviewService reviews;
    private final ArticleContinuationService continuations;
    EditorialController(ArticleDesk desk,Access access,ArticleReviewService reviews,
                        ArticleContinuationService continuations) {
        this.desk=desk; this.access=access; this.reviews=reviews; this.continuations=continuations;
    }
    @GetMapping List<ArticleDesk.Managed> list() {
        var actor=access.current();
        return desk.list(actor.role()==Accounts.Role.REPORTER?actor.id():null);
    }
    @PostMapping ArticleDesk.Managed create(@Valid @RequestBody ArticleDesk.Input input) {
        var actor=access.current();
        if (actor.role()!=Accounts.Role.ADMIN) ReportingRequirements.draft(input);
        return desk.save(null,input,actor.id(),actor.role()==Accounts.Role.ADMIN?PublicationBrand.EDITORIAL_TEAM:actor.displayName());
    }
    @PostMapping("/{id}/continuations") @ResponseStatus(HttpStatus.CREATED)
    ArticleDesk.Managed continueArticle(@PathVariable UUID id) {
        return continuations.create(id, access.current());
    }
    @GetMapping("/{id}") ArticleDesk.Managed find(@PathVariable UUID id) {
        var actor=access.current();
        var article=desk.find(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(actor.role()!=Accounts.Role.ADMIN && !Set.of("DRAFT","PUBLISHED").contains(article.status()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if(actor.role()==Accounts.Role.REPORTER && !actor.id().equals(article.authorId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return article;
    }
    @PutMapping("/{id}") ArticleDesk.Managed update(@PathVariable UUID id,@Valid @RequestBody ArticleDesk.Input input) {
        var actor=access.current();
        return actor.role()==Accounts.Role.ADMIN ? desk.save(id,input,actor.id(),actor.displayName()) : reviews.saveStaffDraft(id,input,actor);
    }
    @PostMapping("/{id}/publication") @PreAuthorize("@access.hasAny('ADMIN')") ArticleDesk.Managed publish(@PathVariable UUID id,@Valid @RequestBody Publication input) {
        return desk.publish(id,input.version(),input.published(),input.breaking(),access.current().id());
    }
}
