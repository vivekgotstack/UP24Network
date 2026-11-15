package com.up24.news.article.internal;

import com.up24.news.article.ArticleDesk;
import com.up24.news.article.ArticleLifecycle;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface ArticleLifecycleStore {
    record Locked(UUID id, long version, String status, String upstreamKey) {}
    ArticleLifecycle.Page browse(UUID authorId, String status, String search, int page, int size);
    Optional<Locked> lock(UUID id);
    void transition(UUID id, String status, UUID actorId);
    void purge(Locked article, UUID actorId);
    List<ArticleLifecycle.Revision> revisions(UUID id);
    Optional<ArticleDesk.Managed> revision(UUID id, long version);
    boolean restore(UUID id, long version, UUID actorId);
    void record(UUID articleId, String action, UUID actorId, long version);
    List<ArticleLifecycle.Activity> activity(UUID id);
}
