package com.up24.news.article;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "up24.automation.scheduling-enabled=false")
@AutoConfigureMockMvc
@Transactional
class ArticleDiscoveryTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @Test void browsesBeyondTheFrontPageAndKeepsPrivateOrUnpublishedDataOut() throws Exception {
        String key = "discovery-" + UUID.randomUUID();
        Instant start = Instant.now().minusSeconds(3600);
        jdbc.batchUpdate("""
                INSERT INTO article_record(id,slug,title,summary,category,city,author,status,published_at,source_notes,video_url,region)
                VALUES (?,?,?,?,?,?,'Test desk','PUBLISHED',?,'private verification notes',?,'uttar-pradesh')
                """, IntStream.range(0, 105).mapToObj(index -> new Object[]{UUID.randomUUID(), key + "-" + index,
                index == 104 ? "साझा रिपोर्ट 100%__" : "साझा रिपोर्ट " + index, "स्थानीय संदर्भ", key,
                index == 104 ? "LUCKNOW" : index == 103 ? "उन्नाव" : "लखनऊ", Timestamp.from(start.minusSeconds(index)), index == 104 ? "/videos/nature-sample.mp4" : null}).toList());
        for (String state : new String[]{"DRAFT", "PUBLISHED"}) {
            jdbc.update("""
                    INSERT INTO article_record(id,slug,title,summary,category,city,author,status,published_at,region)
                    VALUES (?,?,?,'hidden',?,'लखनऊ','Test desk',?,?,'uttar-pradesh')
                    """, UUID.randomUUID(), key + "-" + state, "Unpublished report", key, state,
                    state.equals("DRAFT") ? Timestamp.from(start) : Timestamp.from(Instant.now().plusSeconds(86400)));
        }
        mvc.perform(get("/api/articles/browse").param("category", key).param("region", "uttar-pradesh").param("page", "9"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(105))
                .andExpect(jsonPath("$.pages").value(9)).andExpect(jsonPath("$.items.length()").value(9))
                .andExpect(jsonPath("$.items[8].slug").value(key + "-104"))
                .andExpect(jsonPath("$.items[0].sourceNotes").doesNotExist())
                .andExpect(jsonPath("$.items[0].authorId").doesNotExist());
        mvc.perform(get("/api/articles/browse").param("category", key).param("region", "uttar-pradesh").param("city", "उन्नाव"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].slug").value(key + "-103"));
        mvc.perform(get("/api/articles/browse").param("category", key).param("region", "bihar"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/articles/browse").param("category", key).param("city", "lucknow", "लखनऊ")
                        .param("q", "साझा 100%__").param("videoOnly", "true").param("page", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.page").value(1)).andExpect(jsonPath("$.items[0].slug").value(key + "-104"));
        mvc.perform(get("/api/articles/browse").param("category", key).param("q", "' OR 1=1 --"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
    }

    @Test void rejectsUnboundedDiscoveryRequests() throws Exception {
        mvc.perform(get("/api/articles/browse").param("size", "10000")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/articles/browse").param("page", "0")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/articles/browse").param("q", "x".repeat(201))).andExpect(status().isBadRequest());
    }

    @Test void writtenFeedFindsArticlesBehindVideoImportsWhileLatestKeepsEveryFormat() throws Exception {
        String slug = "mixed-feed-" + UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.batchUpdate("""
                INSERT INTO article_record(id,slug,title,summary,category,author,status,published_at,youtube_id,reel_url)
                VALUES (?,?,?,'Summary',?,'Test desk','PUBLISHED',?,?,?)
                """, java.util.List.of(
                new Object[]{UUID.randomUUID(), slug + "-video", slug, "Videos", Timestamp.from(now.minusSeconds(60)), "abcdefghijk", null},
                new Object[]{UUID.randomUUID(), slug + "-reel", slug, "Trending Reels", Timestamp.from(now.minusSeconds(120)), null, "https://www.instagram.com/reel/test123/"},
                new Object[]{UUID.randomUUID(), slug + "-article", slug, "Uttar Pradesh", Timestamp.from(now.minusSeconds(180)), null, null}
        ));

        mvc.perform(get("/api/articles/browse").param("q", slug))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items[0].slug").value(slug + "-video"))
                .andExpect(jsonPath("$.items[1].slug").value(slug + "-reel"))
                .andExpect(jsonPath("$.items[2].slug").value(slug + "-article"));
        mvc.perform(get("/api/articles/browse").param("q", slug).param("writtenOnly", "true").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].slug").value(slug + "-article"));
    }
}
