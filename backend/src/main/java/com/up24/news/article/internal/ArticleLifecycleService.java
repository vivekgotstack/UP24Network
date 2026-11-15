package com.up24.news.article.internal;

import com.up24.news.article.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import static com.up24.news.article.ArticleOperationException.Reason.*;

@Service
class ArticleLifecycleService implements ArticleLifecycle {
    private final ArticleLifecycleStore store;
    private final ArticleDesk desk;
    private final ApplicationEventPublisher events;
    ArticleLifecycleService(ArticleLifecycleStore store, ArticleDesk desk, ApplicationEventPublisher events) {
        this.store=store; this.desk=desk; this.events=events;
    }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    @Override public Page browse(UUID authorId, String status, String search, int page, int size) {
        var filter=status==null ? "ALL" : status.strip().toUpperCase(Locale.ROOT);
        if (!Set.of("ALL","DRAFT","PUBLISHED","ARCHIVED","TRASH").contains(filter))
            throw new ArticleOperationException(INVALID_ACTION,"Choose a valid article status.");
        var query=search==null ? "" : search.strip();
        if (query.length()>200) throw new ArticleOperationException(INVALID_ACTION,"Search must be at most 200 characters.");
        return store.browse(authorId,filter,query,Math.max(1,page),Math.max(1,Math.min(50,size)));
    }
    private ArticleLifecycleStore.Locked locked(UUID id, long version) {
        var current=store.lock(id).orElseThrow(() -> new ArticleOperationException(NOT_FOUND,"Article not found."));
        if (version<0 || current.version()!=version)
            throw new ArticleOperationException(CONFLICT,"This article changed. Refresh it before applying this action.");
        return current;
    }
    private void changed(UUID id, String action, UUID actor, long version) {
        store.record(id,action,actor,version);
        events.publishEvent(new ArticleChanged(id));
    }
    @Transactional @Override public ArticleDesk.Managed change(UUID id, long version, Action action, UUID actorId) {
        var current=locked(id,version);
        var target=switch(action) {
            case ARCHIVE -> {
                if (!Set.of("DRAFT","PUBLISHED").contains(current.status())) reject("Only drafts or published articles can be archived.");
                yield "ARCHIVED";
            }
            case TRASH -> {
                if (current.status().equals("TRASH")) reject("This article is already in trash.");
                yield "TRASH";
            }
            case RESTORE -> {
                if (!Set.of("ARCHIVED","TRASH").contains(current.status())) reject("Only archived or trashed articles can be restored.");
                yield "DRAFT";
            }
        };
        store.transition(id,target,actorId);
        changed(id,action.name(),actorId,version+1);
        return desk.find(id).orElseThrow();
    }
    @Transactional @Override public void purge(UUID id, long version, UUID actorId) {
        var current=locked(id,version);
        if (!current.status().equals("TRASH")) reject("Move the article to trash before permanently deleting it.");
        store.purge(current,actorId);
        changed(id,"PURGE",actorId,version);
    }
    @Override public List<Revision> revisions(UUID id) {
        if (desk.find(id).isEmpty()) throw new ArticleOperationException(NOT_FOUND,"Article not found.");
        return store.revisions(id);
    }
    @Override public ArticleDesk.Managed revision(UUID id, long version) {
        return store.revision(id,version).orElseThrow(() -> new ArticleOperationException(NOT_FOUND,"Revision not found."));
    }
    @Transactional @Override public ArticleDesk.Managed restoreRevision(UUID id, long version, long currentVersion, UUID actorId) {
        locked(id,currentVersion);
        if (!store.restore(id,version,actorId)) throw new ArticleOperationException(NOT_FOUND,"Revision not found.");
        changed(id,"RESTORE_REVISION",actorId,currentVersion+1);
        return desk.find(id).orElseThrow();
    }
    @Override public List<Activity> activity(UUID id) { return store.activity(id); }
    private void reject(String message) { throw new ArticleOperationException(INVALID_ACTION,message); }
}
