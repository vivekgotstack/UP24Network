package com.up24.news.article.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.article.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.up24.news.article.internal.ArticleFieldPolicy.media;
import java.sql.*;
import java.time.Instant;
import java.util.*;

@Service
class ArticleStore implements ArticleDesk {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final ApplicationEventPublisher events;
    ArticleStore(JdbcTemplate jdbc,ObjectMapper json,ApplicationEventPublisher events) { this.jdbc=jdbc; this.json=json; this.events=events; }
    private Managed map(ResultSet row,int index) throws SQLException {
        return ArticleRows.full(row,json);
    }
    @Override public List<Managed> list(UUID authorId) {
        return authorId==null
                ? jdbc.query("SELECT * FROM article_record WHERE status IN ('DRAFT','PUBLISHED') ORDER BY updated_at DESC LIMIT 150",this::map)
                : jdbc.query("SELECT * FROM article_record WHERE author_id=? AND status IN ('DRAFT','PUBLISHED') ORDER BY updated_at DESC LIMIT 150",this::map,authorId);
    }
    @Override public Optional<Managed> find(UUID id) { return jdbc.query("SELECT * FROM article_record WHERE id=?",this::map,id).stream().findFirst(); }
    @Cacheable(cacheNames="article-feed",condition="@articleCacheInvalidation.readable()")
    @Override public List<ArticleView> published() {
        return jdbc.query("SELECT "+SUMMARY_COLUMNS+" FROM article_record WHERE status='PUBLISHED' AND published_at<=CURRENT_TIMESTAMP ORDER BY published_at DESC LIMIT 100",(row,index)->ArticleRows.summary(row))
                .stream().map(Managed::article).toList();
    }
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    @Cacheable(cacheNames="article-discovery",condition="@articleCacheInvalidation.readable()")
    @Override public ArticlePage browse(ArticleQuery query) {
        var sql = new StringBuilder(" FROM article_record WHERE status='PUBLISHED' AND published_at<=CURRENT_TIMESTAMP");
        Map<String, Object> parameters = new HashMap<>();
        if (!query.region().isEmpty()) {
            sql.append(" AND region=:region");
            parameters.put("region", query.region());
        }
        if (!query.categories().isEmpty()) {
            sql.append(" AND category IN (:categories)");
            parameters.put("categories", query.categories());
        }
        if (!query.cities().isEmpty()) {
            sql.append(" AND lower(trim(city)) IN (:cities)");
            parameters.put("cities", query.cities());
        }
        if (query.videoOnly()) sql.append(" AND (NULLIF(video_url,'') IS NOT NULL OR NULLIF(youtube_id,'') IS NOT NULL)");
        if (!query.search().isBlank()) {
            String[] words = query.search().toLowerCase(Locale.ROOT).split("\\s+");
            for (int index = 0; index < words.length; index++) {
                String key = "word" + index;
                sql.append(" AND lower(title || ' ' || summary || ' ' || city || ' ' || category) LIKE :").append(key).append(" ESCAPE '!'");
                parameters.put(key, "%" + words[index].replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
            }
        }
        var named = new NamedParameterJdbcTemplate(jdbc);
        long total = Objects.requireNonNull(named.queryForObject("SELECT count(*)" + sql, parameters, Long.class));
        int pages = ArticlePage.pages(total, query.size()), page = Math.min(query.page(), pages);
        parameters.put("limit", query.size());
        parameters.put("offset", (long) (page - 1) * query.size());
        var items = named.query("SELECT "+SUMMARY_COLUMNS + sql + " ORDER BY published_at DESC,id DESC LIMIT :limit OFFSET :offset", parameters, (row,index)->ArticleRows.summary(row))
                .stream().map(Managed::article).toList();
        return new ArticlePage(items, total, page, query.size(), pages);
    }
    @Cacheable(cacheNames="article-detail",condition="@articleCacheInvalidation.readable()")
    @Override public Optional<ArticleView> findPublished(String slug) {
        return jdbc.query("SELECT a.* FROM article_record a JOIN article_address address ON address.article_id=a.id WHERE address.slug=? AND a.status='PUBLISHED' AND a.published_at<=CURRENT_TIMESTAMP",this::map,slug)
                .stream().map(Managed::article).findFirst();
    }
    private void concurrentChange(UUID id) {
        if (find(id).isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Article not found");
        throw new ArticleConflictException();
    }
    private String value(String text) { return text==null?"":text.trim(); }
    private String bodyJson(List<String> paragraphs) {
        try { return json.writeValueAsString(paragraphs); }
        catch(java.io.IOException exception) { throw new IllegalArgumentException("Invalid article body"); }
    }
    @Transactional @Override public Managed save(UUID id,Input input,UUID actor,String author) {
        if (id!=null && input.version()==null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The saved article version is required");
        UUID articleId=id==null?UUID.randomUUID():id;
        String slug=ArticleFieldPolicy.slug(input.slug());
        String paragraphs=bodyJson(Arrays.stream(input.body().split("\\n\\s*\\n")).map(String::trim).filter(p->!p.isBlank()).toList());
        String image=media(input.image(),"image"),video=media(input.videoUrl(),"video");
        try {
            if(id==null) jdbc.update("INSERT INTO article_record(id,slug,title,summary,category,city,author,author_id,image,image_alt,video_url,youtube_id,paragraphs,manual_override,source_notes,region,edited_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?::jsonb,TRUE,?,?,?)",
                    articleId,slug,input.title().trim(),input.summary().trim(),input.category(),value(input.city()),value(input.byline()).isEmpty()?author:input.byline().strip(),actor,image,value(input.imageAlt()),video,value(input.youtubeId()).isEmpty()?null:input.youtubeId(),paragraphs,value(input.sourceNotes()),value(input.region()),actor);
            else if(jdbc.update("UPDATE article_record SET slug=?,title=?,summary=?,category=?,city=?,image=?,image_alt=?,video_url=?,youtube_id=?,paragraphs=?::jsonb,source_notes=?,region=?,author=CASE WHEN ?='' THEN author ELSE ? END,edited_by=?,manual_override=TRUE,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND status IN ('DRAFT','PUBLISHED')",
                    slug,input.title().trim(),input.summary().trim(),input.category(),value(input.city()),image,value(input.imageAlt()),video,value(input.youtubeId()).isEmpty()?null:input.youtubeId(),paragraphs,value(input.sourceNotes()),value(input.region()),value(input.byline()),value(input.byline()),actor,id,input.version())==0)
                concurrentChange(id);
        } catch(DuplicateKeyException exception) { throw new ResponseStatusException(HttpStatus.CONFLICT,"That article slug is already in use"); }
        events.publishEvent(new ArticleChanged(articleId));
        return find(articleId).orElseThrow();
    }
    @Transactional @Override public Managed publish(UUID id,long version,boolean published,boolean breaking) {
        return publish(id,version,published,breaking,null);
    }
    @Transactional @Override public Managed publish(UUID id,long version,boolean published,boolean breaking,UUID actor) {
        if(jdbc.update("UPDATE article_record SET status=?,breaking=?,published_at=CASE WHEN ? THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE published_at END,edited_by=?,manual_override=TRUE,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND status IN ('DRAFT','PUBLISHED')",
                published?"PUBLISHED":"DRAFT",published&&breaking,published,actor,id,version)==0) concurrentChange(id);
        events.publishEvent(new ArticleChanged(id));
        return find(id).orElseThrow();
    }
    @Transactional @Override public boolean importPublished(Imported input) {
        if(input.publishedAt().isAfter(Instant.now())) return false;
        JdbcArticleLifecycleStore.lockSource(jdbc,input.upstreamKey());
        if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM article_suppressed_source WHERE upstream_key=?)",Boolean.class,input.upstreamKey()))) return false;
        UUID id=UUID.nameUUIDFromBytes(input.upstreamKey().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        boolean changed=jdbc.update("""
                INSERT INTO article_record(id,slug,title,summary,category,city,author,status,published_at,image,image_alt,video_url,youtube_id,paragraphs,breaking,upstream_key,source_url,region)
                VALUES (?,?,?,?,?,?,'UP24Network Desk','PUBLISHED',?,?,?,?,?,?::jsonb,?,?,?,?)
                ON CONFLICT(upstream_key) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,category=EXCLUDED.category,
                image=EXCLUDED.image,image_alt=EXCLUDED.image_alt,video_url=EXCLUDED.video_url,youtube_id=EXCLUDED.youtube_id,
                paragraphs=EXCLUDED.paragraphs,breaking=EXCLUDED.breaking,source_url=EXCLUDED.source_url,city=EXCLUDED.city,region=EXCLUDED.region,version=article_record.version+1,updated_at=CURRENT_TIMESTAMP
                WHERE NOT article_record.manual_override AND
                    ROW(article_record.title,article_record.summary,article_record.category,article_record.city,
                        article_record.image,article_record.image_alt,article_record.video_url,article_record.youtube_id,
                        article_record.paragraphs,article_record.breaking,article_record.source_url,article_record.region)
                    IS DISTINCT FROM ROW(EXCLUDED.title,EXCLUDED.summary,EXCLUDED.category,EXCLUDED.city,
                        EXCLUDED.image,EXCLUDED.image_alt,EXCLUDED.video_url,EXCLUDED.youtube_id,
                        EXCLUDED.paragraphs,EXCLUDED.breaking,EXCLUDED.source_url,EXCLUDED.region)
                """,id,input.slug(),input.title(),input.summary(),input.category(),input.city(),Timestamp.from(input.publishedAt()),
                media(input.image(),"image"),input.imageAlt(),media(input.videoUrl(),"video"),input.youtubeId(),bodyJson(input.paragraphs()),input.breaking(),input.upstreamKey(),input.sourceUrl(),value(input.region()))>0;
        if(changed) events.publishEvent(new ArticleChanged(id));
        return changed;
    }
    static final String SUMMARY_COLUMNS="id,author_id,status,manual_override,version,slug,title,summary,category,city,author,published_at,reading_minutes,image,image_alt,video_url,youtube_id,breaking,source_url,region";
}
