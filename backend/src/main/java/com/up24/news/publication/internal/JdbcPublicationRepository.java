package com.up24.news.publication.internal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.up24.news.publication.Publication.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
class JdbcPublicationRepository implements PublicationRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    JdbcPublicationRepository(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc=jdbc; this.json=json; }

    private String content(Object input) {
        ObjectNode value=json.valueToTree(input);
        value.remove("version");
        return value.toString();
    }
    private Document document(ResultSet row, int index) throws SQLException {
        try {
            var input=json.readValue(row.getString("content"),DocumentInput.class);
            return new Document("/"+row.getString("slug"),input.label(),input.title(),input.description(),input.intro(),
                    input.sections(),row.getLong("version"),row.getTimestamp("updated_at").toInstant());
        } catch (JsonProcessingException exception) { throw new SQLException("Invalid stored publication document",exception); }
    }
    @Override public Settings settings() {
        return jdbc.queryForObject("SELECT content,version,updated_at FROM publication_settings WHERE id=1", (row,index) -> {
            try {
                var input=json.readValue(row.getString("content"),SettingsInput.class);
                return new Settings(input.tagline(),input.announcementEnabled(),input.announcement(),input.footerDescription(),
                        input.showRashifal(),input.showVideo(),row.getLong("version"),row.getTimestamp("updated_at").toInstant());
            } catch (JsonProcessingException exception) { throw new SQLException("Invalid stored publication settings",exception); }
        });
    }
    @Override public Optional<Document> page(String slug) {
        return jdbc.query("SELECT slug,content,version,updated_at FROM publication_page WHERE slug=?",this::document,slug).stream().findFirst();
    }
    @Override public List<Document> pages() {
        return jdbc.query("SELECT slug,content,version,updated_at FROM publication_page ORDER BY position,slug",this::document);
    }
    @Override public boolean updateSettings(SettingsInput input, Instant now) {
        return jdbc.update("UPDATE publication_settings SET content=?::jsonb,version=version+1,updated_at=? WHERE id=1 AND version=?",
                content(input),Timestamp.from(now),input.version())==1;
    }
    @Override public boolean updatePage(String slug, DocumentInput input, Instant now) {
        return jdbc.update("UPDATE publication_page SET content=?::jsonb,version=version+1,updated_at=? WHERE slug=? AND version=?",
                content(input),Timestamp.from(now),slug,input.version())==1;
    }
    @Override public void seedSettings(SettingsInput input, Instant now) {
        jdbc.update("INSERT INTO publication_settings(id,content,updated_at) VALUES (1,?::jsonb,?) ON CONFLICT(id) DO NOTHING",content(input),Timestamp.from(now));
    }
    @Override public void seedPage(String slug, DocumentInput input, Instant now) {
        jdbc.update("INSERT INTO publication_page(slug,content,updated_at,position) VALUES (?,?::jsonb,?,(SELECT count(*) FROM publication_page)) ON CONFLICT(slug) DO NOTHING",
                slug,content(input),Timestamp.from(now));
    }
}
