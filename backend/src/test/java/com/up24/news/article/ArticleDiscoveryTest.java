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
}
