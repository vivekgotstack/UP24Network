package com.up24.news.article.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.article.ArticleDesk;
import com.up24.news.article.ArticleView;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;

/** One explicit mapper for live rows, lean desk projections and typed historical snapshots. */
final class ArticleRows {
    private ArticleRows() {}
    static ArticleDesk.Managed full(ResultSet row, ObjectMapper json) throws SQLException { return managed(row,json,true); }
    static ArticleDesk.Managed summary(ResultSet row) throws SQLException { return managed(row,null,false); }
    private static ArticleDesk.Managed managed(ResultSet row, ObjectMapper json, boolean body) throws SQLException {
        try {
            List<String> paragraphs=body ? json.readValue(row.getString("paragraphs"),new TypeReference<>() {}) : List.of();
            ArticleView.English english = english(row, json, body);
            Timestamp published=row.getTimestamp("published_at");
            var view=new ArticleView(row.getString("slug"),row.getString("title"),row.getString("summary"),
                    row.getString("category"),row.getString("city"),row.getString("author"),
                    published==null?null:published.toInstant(),row.getInt("reading_minutes"),row.getString("image"),
                    row.getString("image_alt"),row.getString("video_url"),paragraphs,false,row.getString("youtube_id"),
                    row.getBoolean("breaking"),row.getString("source_url"),row.getString("reel_url"),
                    Math.max(1,row.getInt("edition_number")),row.getObject("continuation_root_id",UUID.class),
                    row.getString("continuation_of_slug"), english, row.getString("updated_byline"));
            return new ArticleDesk.Managed(row.getObject("id",UUID.class),row.getObject("author_id",UUID.class),
                    row.getString("status"),row.getBoolean("manual_override"),row.getLong("version"),view,
                    body?row.getString("source_notes"):"",row.getString("region"));
        } catch(java.io.IOException exception) { throw new SQLException("Invalid stored article",exception); }
    }

    private static ArticleView.English english(ResultSet row, ObjectMapper json, boolean body) throws SQLException, java.io.IOException {
        if (body) {
            String content = row.getString("english_content");
            return content == null ? null : json.readValue(content, ArticleView.English.class);
        }
        String title = row.getString("english_title");
        return title == null ? null : new ArticleView.English(title, row.getString("english_summary"),
                List.of(), row.getString("english_image_alt"));
    }
}
