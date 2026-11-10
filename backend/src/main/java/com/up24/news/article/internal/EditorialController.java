package com.up24.news.article.internal;

import com.up24.news.article.ArticleDesk;
import com.up24.news.identity.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/admin/articles")
@PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
class EditorialController {
    record Publication(boolean published,boolean breaking) {}
    private final ArticleDesk desk;
    private final Access access;
    EditorialController(ArticleDesk desk,Access access) { this.desk=desk; this.access=access; }
    @GetMapping List<ArticleDesk.Managed> list() {
        var actor=access.current();
        return desk.list().stream().filter(article->actor.role()!=Accounts.Role.REPORTER || actor.id().equals(article.authorId())).toList();
    }
    @PostMapping ArticleDesk.Managed create(@Valid @RequestBody ArticleDesk.Input input) {
        var actor=access.current(); return desk.save(null,input,actor.id(),actor.displayName());
    }
    @PutMapping("/{id}") ArticleDesk.Managed update(@PathVariable UUID id,@Valid @RequestBody ArticleDesk.Input input) {
        var actor=access.current(); var existing=desk.find(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(actor.role()==Accounts.Role.REPORTER && (!actor.id().equals(existing.authorId()) || !existing.status().equals("DRAFT")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return desk.save(id,input,actor.id(),actor.displayName());
    }
    @PostMapping("/{id}/publication") @PreAuthorize("@access.hasAny('ADMIN','EDITOR')") ArticleDesk.Managed publish(@PathVariable UUID id,@RequestBody Publication input) {
        return desk.publish(id,input.published(),input.breaking());
    }
}
