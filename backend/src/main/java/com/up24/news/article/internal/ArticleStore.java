package com.up24.news.article.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.article.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.sql.*;
import java.time.Instant;
import java.util.*;

@Service
class ArticleStore implements ArticleDesk {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    ArticleStore(JdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
    private Managed map(ResultSet row,int index) throws SQLException {
        try {
            List<String> paragraphs=json.readValue(row.getString("paragraphs"),new TypeReference<>() {});
            Timestamp published=row.getTimestamp("published_at");
            var view=new ArticleView(row.getString("slug"),row.getString("title"),row.getString("summary"),
                    row.getString("category"),row.getString("city"),row.getString("author"),
                    published==null?null:published.toInstant(),Math.max(1,paragraphs.stream().mapToInt(p->p.split("\\s+").length).sum()/180),
                    row.getString("image"),row.getString("image_alt"),row.getString("video_url"),paragraphs,false,
                    row.getString("youtube_id"),row.getBoolean("breaking"),row.getString("source_url"));
            return new Managed(row.getObject("id",UUID.class),row.getObject("author_id",UUID.class),row.getString("status"),row.getBoolean("manual_override"),row.getLong("version"),view);
        } catch (java.io.IOException exception) { throw new SQLException("Invalid stored article",exception); }
    }
    @Override public List<Managed> list(UUID authorId) {
        return authorId==null
                ? jdbc.query("SELECT * FROM article_record ORDER BY updated_at DESC LIMIT 150",this::map)
                : jdbc.query("SELECT * FROM article_record WHERE author_id=? ORDER BY updated_at DESC LIMIT 150",this::map,authorId);
    }
    @Override public Optional<Managed> find(UUID id) { return jdbc.query("SELECT * FROM article_record WHERE id=?",this::map,id).stream().findFirst(); }
    @Override public List<ArticleView> published() {
        return jdbc.query("SELECT * FROM article_record WHERE status='PUBLISHED' AND published_at<=CURRENT_TIMESTAMP ORDER BY published_at DESC LIMIT 100",this::map)
                .stream().map(Managed::article).toList();
    }
    @Override public Optional<ArticleView> findPublished(String slug) {
        return jdbc.query("SELECT * FROM article_record WHERE slug=? AND status='PUBLISHED' AND published_at<=CURRENT_TIMESTAMP",this::map,slug)
                .stream().map(Managed::article).findFirst();
    }
    private void concurrentChange(UUID id) {
        if (find(id).isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Article not found");
        throw new ArticleConflictException();
    }
    private String value(String text) { return text==null?"":text.trim(); }
    private String media(String input,String kind) {
        String text=value(input);
        if(text.isBlank()) return kind.equals("image")?"/brand/up24-logo.png":null;
        boolean local=text.matches("^/(images|brand|videos)/[A-Za-z0-9._/-]+$")&&!text.contains("..");
        try {
            URI uri=URI.create(text);
            if(local || ("https".equals(uri.getScheme()) && uri.getRawUserInfo()==null && (Set.of("up24network.com","www.up24network.com").contains(uri.getHost()) || (kind.equals("image")&&Set.of("i.ytimg.com","i1.ytimg.com","i2.ytimg.com","i3.ytimg.com","i4.ytimg.com").contains(uri.getHost()))))) return text;
        } catch (IllegalArgumentException ignored) {}
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use a local asset or an HTTPS media URL from UP24Network");
    }
    private String bodyJson(List<String> paragraphs) {
        try { return json.writeValueAsString(paragraphs); }
        catch(java.io.IOException exception) { throw new IllegalArgumentException("Invalid article body"); }
    }
    @Transactional @Override public Managed save(UUID id,Input input,UUID actor,String author) {
        if (id!=null && input.version()==null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The saved article version is required");
        UUID articleId=id==null?UUID.randomUUID():id;
        String slug=input.slug().trim().toLowerCase(Locale.ROOT);
        if(!slug.matches("[\\p{L}\\p{N}\\p{M}_-]+")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use letters, numbers and hyphens in the slug");
        String paragraphs=bodyJson(Arrays.stream(input.body().split("\\n\\s*\\n")).map(String::trim).filter(p->!p.isBlank()).toList());
        String image=media(input.image(),"image"),video=media(input.videoUrl(),"video");
        try {
            if(id==null) jdbc.update("INSERT INTO article_record(id,slug,title,summary,category,city,author,author_id,image,image_alt,video_url,youtube_id,paragraphs,manual_override) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?::jsonb,TRUE)",
                    articleId,slug,input.title().trim(),input.summary().trim(),input.category(),value(input.city()),author,actor,image,value(input.imageAlt()),video,value(input.youtubeId()).isEmpty()?null:input.youtubeId(),paragraphs);
            else if(jdbc.update("UPDATE article_record SET slug=?,title=?,summary=?,category=?,city=?,image=?,image_alt=?,video_url=?,youtube_id=?,paragraphs=?::jsonb,manual_override=TRUE,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",
                    slug,input.title().trim(),input.summary().trim(),input.category(),value(input.city()),image,value(input.imageAlt()),video,value(input.youtubeId()).isEmpty()?null:input.youtubeId(),paragraphs,id,input.version())==0)
                concurrentChange(id);
        } catch(DuplicateKeyException exception) { throw new ResponseStatusException(HttpStatus.CONFLICT,"That article slug is already in use"); }
        return find(articleId).orElseThrow();
    }
    @Transactional @Override public Managed publish(UUID id,long version,boolean published,boolean breaking) {
        if(jdbc.update("UPDATE article_record SET status=?,breaking=?,published_at=CASE WHEN ? THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE published_at END,manual_override=TRUE,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",
                published?"PUBLISHED":"DRAFT",published&&breaking,published,id,version)==0) concurrentChange(id);
        return find(id).orElseThrow();
    }
    @Override public boolean importPublished(Imported input) {
        if(input.publishedAt().isAfter(Instant.now())) return false;
        UUID id=UUID.nameUUIDFromBytes(input.upstreamKey().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return jdbc.update("""
                INSERT INTO article_record(id,slug,title,summary,category,city,author,status,published_at,image,image_alt,video_url,youtube_id,paragraphs,breaking,upstream_key,source_url)
                VALUES (?,?,?,?,?,?,'UP24Network Desk','PUBLISHED',?,?,?,?,?,?::jsonb,?,?,?)
                ON CONFLICT(upstream_key) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,category=EXCLUDED.category,
                image=EXCLUDED.image,image_alt=EXCLUDED.image_alt,video_url=EXCLUDED.video_url,youtube_id=EXCLUDED.youtube_id,
                paragraphs=EXCLUDED.paragraphs,breaking=EXCLUDED.breaking,source_url=EXCLUDED.source_url,version=article_record.version+1,updated_at=CURRENT_TIMESTAMP
                WHERE NOT article_record.manual_override
                """,id,input.slug(),input.title(),input.summary(),input.category(),input.city(),Timestamp.from(input.publishedAt()),
                media(input.image(),"image"),input.imageAlt(),media(input.videoUrl(),"video"),input.youtubeId(),bodyJson(input.paragraphs()),input.breaking(),input.upstreamKey(),input.sourceUrl())>0;
    }
}
