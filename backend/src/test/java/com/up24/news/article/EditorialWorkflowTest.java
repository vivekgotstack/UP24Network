package com.up24.news.article;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.identity.Accounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "up24.automation.scheduling-enabled=false")
@AutoConfigureMockMvc
@Transactional
class EditorialWorkflowTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired Accounts accounts;
    @Autowired ArticleDesk desk;
    @Autowired JdbcTemplate jdbc;
    private Accounts.Account editor;
    private Accounts.Account reporter;
    private static final String PASSWORD = "Local-editorial-test-2026!";

    @BeforeEach void accounts() {
        String key = UUID.randomUUID().toString();
        editor = accounts.create(key + "@editor.test", "Test editor", PASSWORD, Accounts.Role.EDITOR);
        reporter = accounts.create(key + "@reporter.test", "Test reporter", PASSWORD, Accounts.Role.REPORTER);
    }

    private org.springframework.mock.web.MockHttpSession verified(String email) {
        var session = new org.springframework.mock.web.MockHttpSession();
        session.setAttribute("up24.newsroom.verified-email",email);
        session.setAttribute("up24.newsroom.verified-until",java.time.Instant.MAX);
        return session;
    }
    private ArticleDesk.Input input(String slug, String title, Long version) {
        return new ArticleDesk.Input(title,slug,"परीक्षण का सारांश।","Uttar Pradesh","Lucknow",
                "/images/newsroom.jpg","UP24Network newsroom",null,null,"परीक्षण रिपोर्ट का पाठ।",version,"Local test reporting notes","uttar-pradesh");
    }

    @Test void realLoginAndDraftPublicationRespectPermissionsAndCsrf() throws Exception {
        mvc.perform(formLogin("/api/auth/login").user("email",editor.email()).password(PASSWORD))
                .andExpect(status().isOk()).andExpect(authenticated().withUsername(editor.email()));
        assertThat(jdbc.queryForObject("SELECT password_hash FROM identity_account WHERE id=?",String.class,editor.id()))
                .startsWith("{bcrypt}");
        String slug = "workflow-" + UUID.randomUUID();
        String body = json.writeValueAsString(input(slug,"परीक्षण रिपोर्ट",null));
        mvc.perform(post("/api/admin/articles").with(user(reporter.email())).session(verified(reporter.email())).contentType("application/json").content(body))
                .andExpect(status().isForbidden());
        var result = mvc.perform(post("/api/admin/articles").with(user(reporter.email())).session(verified(reporter.email())).with(csrf())
                .contentType("application/json").content(body)).andExpect(status().isOk()).andReturn();
        var draft = json.readValue(result.getResponse().getContentAsString(),ArticleDesk.Managed.class);
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isNotFound());
        String publication = "{\"version\":0,\"published\":true,\"breaking\":false}";
        mvc.perform(post("/api/admin/articles/"+draft.id()+"/publication").with(user(reporter.email())).session(verified(reporter.email())).with(csrf())
                .contentType("application/json").content(publication)).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/articles/"+draft.id()+"/publication").with(user(editor.email())).session(verified(editor.email())).with(csrf())
                .contentType("application/json").content(publication)).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("परीक्षण रिपोर्ट"));
        desk.publish(draft.id(),1,false,false);
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isNotFound());
    }

    @Test void staleEditsAndPublicationCannotOverwriteNewerWorkAndRolesAreRechecked() throws Exception {
        var draft = desk.save(null,input("revision-"+UUID.randomUUID(),"Original",null),reporter.id(),reporter.displayName());
        var saved = desk.save(draft.id(),input(draft.article().slug(),"Newer report",0L),reporter.id(),reporter.displayName());
        mvc.perform(put("/api/admin/articles/"+draft.id()).with(user(reporter.email())).session(verified(reporter.email())).with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(input(draft.article().slug(),"Stale report",0L))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.type").value("urn:up24:article-version-conflict"));
        mvc.perform(post("/api/admin/articles/"+draft.id()+"/publication").with(user(editor.email())).session(verified(editor.email())).with(csrf())
                .contentType("application/json").content("{\"version\":0,\"published\":true,\"breaking\":false}"))
                .andExpect(status().isConflict());
        assertThat(desk.find(draft.id()).orElseThrow().article().title()).isEqualTo("Newer report");
        mvc.perform(get("/api/admin/articles/"+draft.id()).with(user(editor.email())).session(verified(editor.email()))).andExpect(status().isOk());
        jdbc.update("UPDATE identity_account SET role='SUBSCRIBER' WHERE id=?",editor.id());
        mvc.perform(get("/api/admin/articles/"+saved.id()).with(user(editor.email())).session(verified(editor.email()))).andExpect(status().isForbidden());
        var others = desk.save(null,input("private-"+UUID.randomUUID(),"Private",null),editor.id(),editor.displayName());
        mvc.perform(get("/api/admin/articles/"+others.id()).with(user(reporter.email())).session(verified(reporter.email()))).andExpect(status().isNotFound());
    }

    @Test void oldPublishedArticlesRemainAddressableOutsideTheLatestFeed() throws Exception {
        var draft = desk.save(null,input("archive-"+UUID.randomUUID(),"Archive",null),editor.id(),editor.displayName());
        desk.publish(draft.id(),0,true,false);
        jdbc.update("UPDATE article_record SET published_at='2000-01-01' WHERE id=?",draft.id());
        jdbc.update("""
                INSERT INTO article_record(id,slug,title,summary,category,author,status,published_at)
                SELECT md5(random()::text || g::text)::uuid, 'feed-' || md5(random()::text || g::text),
                'Feed report','Summary','India','Test desk','PUBLISHED',CURRENT_TIMESTAMP
                FROM generate_series(1,101) g
                """);
        assertThat(desk.published()).noneMatch(article -> article.slug().equals(draft.article().slug()));
        mvc.perform(get("/api/articles/"+draft.article().slug())).andExpect(status().isOk());
    }
}
