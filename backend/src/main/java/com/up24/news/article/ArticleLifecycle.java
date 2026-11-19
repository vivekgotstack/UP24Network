package com.up24.news.article;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Administrative content lifecycle; storage and transport remain module internals. */
public interface ArticleLifecycle {
    enum Action { ARCHIVE, TRASH, RESTORE }
    record Page(List<ArticleDesk.Managed> items, long total, int page, int size, int pages, Map<String,Long> counts) {
        public Page { items=List.copyOf(items); counts=Map.copyOf(counts); }
    }
    record Revision(long version, Instant savedAt, String title, String status, UUID actorId) {}
    record EditorialEvidence(String changeSummary, String verificationNotes) {}
    record Activity(UUID id, String action, UUID actorId, long version, Instant occurredAt, EditorialEvidence evidence) {}

    Page browse(UUID authorId, String status, String search, int page, int size);
    ArticleDesk.Managed change(UUID id, long version, Action action, UUID actorId);
    void purge(UUID id, long version, UUID actorId);
    List<Revision> revisions(UUID id);
    ArticleDesk.Managed revision(UUID id, long version);
    ArticleDesk.Managed restoreRevision(UUID id, long version, long currentVersion, UUID actorId);
    List<Activity> activity(UUID id);
}
