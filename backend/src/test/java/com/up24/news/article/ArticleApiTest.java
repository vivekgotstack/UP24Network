package com.up24.news.article;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("demo")
class ArticleApiTest {
    @Autowired MockMvc mvc;

    @Test
    void listsDemoArticlesWithTheirPublicRoutes() throws Exception {
        mvc.perform(get("/api/articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[0].slug").value("closer-to-home"))
                .andExpect(jsonPath("$[0].demo").value(true));
    }

    @Test
    void readsAnArticleIncludingItsBody() throws Exception {
        mvc.perform(get("/api/articles/closer-to-home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("Uttar Pradesh"))
                .andExpect(jsonPath("$.paragraphs", hasSize(3)));
    }

    @Test
    void missingArticleReturns404() throws Exception {
        mvc.perform(get("/api/articles/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
    }

    @Test
    void videoStoryIncludesAPlayableSourceAndPoster() throws Exception {
        mvc.perform(get("/api/articles/a-moment-in-nature"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoUrl").value("/videos/nature-sample.mp4"))
                .andExpect(jsonPath("$.image").value("/images/nature.jpg"));
    }
}
