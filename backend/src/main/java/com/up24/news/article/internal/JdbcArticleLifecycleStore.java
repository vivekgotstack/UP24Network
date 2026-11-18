package com.up24.news.article.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.article.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
class JdbcArticleLifecycleStore implements ArticleLifecycleStore {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    JdbcArticleLifecycleStore(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc=jdbc; this.json=json; }

    @Override public ArticleLifecycle.Page browse(UUID authorId, String status, String search, int page, int size) {
        var scope=new StringBuilder(" FROM article_record WHERE TRUE");
        Map<String,Object> parameters=new HashMap<>();
        if (authorId!=null) { scope.append(" AND author_id=:author"); parameters.put("author",authorId); }
        if (!search.isEmpty()) {
            scope.append(" AND lower(title || ' ' || summary || ' ' || city || ' ' || category) LIKE :search ESCAPE '!'");
            parameters.put("search","%"+search.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%");
        }
        var named=new NamedParameterJdbcTemplate(jdbc);
        Map<String,Long> counts=new LinkedHashMap<>();
        for (var value:List.of("DRAFT","PUBLISHED","ARCHIVED","TRASH")) counts.put(value,0L);
        named.query("SELECT status,count(*) AS total"+scope+" GROUP BY status",parameters,
                (org.springframework.jdbc.core.RowCallbackHandler) row -> counts.put(row.getString("status"),row.getLong("total")));
        var filter=scope+(status.equals("ALL")?" AND status IN ('DRAFT','PUBLISHED')":" AND status=:status");
        parameters.put("status",status);
        long total=Objects.requireNonNull(named.queryForObject("SELECT count(*)"+filter,parameters,Long.class));
        int pages=ArticlePage.pages(total,size),currentPage=Math.min(page,pages);
        parameters.put("limit",size); parameters.put("offset",(long)(currentPage-1)*size);
        var rows=named.query("SELECT "+ArticleStore.SUMMARY_COLUMNS+filter+" ORDER BY updated_at DESC,id DESC LIMIT :limit OFFSET :offset",
                parameters,(row,index) -> ArticleRows.summary(row));
        return new ArticleLifecycle.Page(rows,total,currentPage,size,pages,counts);
    }
    @Override public Optional<Locked> lock(UUID id) {
        var sources=jdbc.query("SELECT upstream_key FROM article_record WHERE id=?",(row,index) -> row.getString(1),id);
        if (sources.isEmpty()) return Optional.empty();
        if (sources.getFirst()!=null) lockSource(jdbc,sources.getFirst());
        return jdbc.query("SELECT id,version,status,upstream_key FROM article_record WHERE id=? FOR UPDATE",
                (row,index) -> new Locked(row.getObject("id",UUID.class),row.getLong("version"),row.getString("status"),row.getString("upstream_key")),id).stream().findFirst();
    }
    static void lockSource(JdbcTemplate jdbc, String source) {
        // Imports and purges share this lock before either acquires an article row lock.
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",(row,index) -> true,"article-source:"+source);
    }
    @Override public void transition(UUID id, String status, UUID actorId) {
        jdbc.update("UPDATE article_record SET status=?,breaking=FALSE,manual_override=TRUE,edited_by=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",status,actorId,id);
    }
    @Override public void purge(Locked article, UUID actorId) {
        if (article.upstreamKey()!=null) jdbc.update("INSERT INTO article_suppressed_source(upstream_key,actor_id) VALUES (?,?) ON CONFLICT DO NOTHING",article.upstreamKey(),actorId);
        jdbc.update("DELETE FROM article_record WHERE id=?",article.id());
    }
    @Override public List<ArticleLifecycle.Revision> revisions(UUID id) {
        return jdbc.query("SELECT version,saved_at,actor_id,snapshot->>'title' AS title,snapshot->>'status' AS status FROM article_revision WHERE article_id=? ORDER BY version DESC LIMIT 20",
                (row,index) -> new ArticleLifecycle.Revision(row.getLong("version"),row.getTimestamp("saved_at").toInstant(),row.getString("title"),row.getString("status"),row.getObject("actor_id",UUID.class)),id);
    }
    @Override public Optional<ArticleDesk.Managed> revision(UUID id, long version) {
        return jdbc.query("SELECT (jsonb_populate_record(NULL::article_record,snapshot)).* FROM article_revision WHERE article_id=? AND version=?",
                (row,index) -> ArticleRows.full(row,json),id,version).stream().findFirst();
    }
    @Override public boolean restore(UUID id, long version, UUID actorId) {
        try {
            return jdbc.update("""
                    UPDATE article_record a SET title=r.snapshot->>'title',slug=r.snapshot->>'slug',
                        summary=r.snapshot->>'summary',category=r.snapshot->>'category',city=COALESCE(r.snapshot->>'city',''),
                        author=r.snapshot->>'author',image=r.snapshot->>'image',image_alt=COALESCE(r.snapshot->>'image_alt',''),
                        video_url=r.snapshot->>'video_url',youtube_id=r.snapshot->>'youtube_id',reel_url=r.snapshot->>'reel_url',paragraphs=r.snapshot->'paragraphs',
                        source_notes=COALESCE(r.snapshot->>'source_notes',''),region=COALESCE(r.snapshot->>'region',''),
                        status='DRAFT',breaking=FALSE,manual_override=TRUE,edited_by=?,version=a.version+1,updated_at=CURRENT_TIMESTAMP
                    FROM article_revision r WHERE a.id=? AND r.article_id=a.id AND r.version=?
                    """,actorId,id,version)>0;
        } catch(DuplicateKeyException exception) {
            throw new ArticleOperationException(ArticleOperationException.Reason.CONFLICT,"That historical URL is now used by another report. Edit its slug before restoring this revision.");
        }
    }
    @Override public void record(UUID articleId, String action, UUID actorId, long version) {
        jdbc.update("INSERT INTO article_activity(id,article_id,action,actor_id,version) VALUES (?,?,?,?,?)",UUID.randomUUID(),articleId,action,actorId,version);
        jdbc.update("DELETE FROM article_activity WHERE article_id=? AND id NOT IN (SELECT id FROM article_activity WHERE article_id=? ORDER BY occurred_at DESC,id DESC LIMIT 100)",articleId,articleId);
    }
    @Override public List<ArticleLifecycle.Activity> activity(UUID id) {
        return jdbc.query("SELECT * FROM article_activity WHERE article_id=? ORDER BY occurred_at DESC,id DESC LIMIT 50",
                (row,index) -> new ArticleLifecycle.Activity(row.getObject("id",UUID.class),row.getString("action"),row.getObject("actor_id",UUID.class),row.getLong("version"),row.getTimestamp("occurred_at").toInstant()),id);
    }
}
