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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"up24.automation.scheduling-enabled=false", "up24.newsroom.admin-email=owner@editorial.test"})
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
    private Accounts.Account owner;
    private static final String PASSWORD = "Local-editorial-test-2026!";

    @BeforeEach void accounts() {
        String key = UUID.randomUUID().toString();
        editor = accounts.create(key + "@editor.test", "Test editor", PASSWORD, Accounts.Role.EDITOR);
        reporter = accounts.create(key + "@reporter.test", "Test reporter", PASSWORD, Accounts.Role.REPORTER);
        owner = accounts.create("owner@editorial.test", "Owner", PASSWORD, Accounts.Role.ADMIN);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor verified(String email) {
        return com.up24.news.support.VerifiedLogin.verified(accounts.find(email).orElseThrow(),jdbc,java.time.Instant.now());
    }
    private ArticleDesk.Input input(String slug, String title, Long version) {
        return new ArticleDesk.Input(title,slug,"परीक्षण का सारांश।","Uttar Pradesh","Lucknow",
                "/images/newsroom.jpg","UP24Network newsroom",null,null,"परीक्षण रिपोर्ट का पाठ।",version,"Local test reporting notes","uttar-pradesh");
    }

    private ArticleDesk.Input reel(String slug, String url, Long version) {
        return new ArticleDesk.Input("Instagram report", slug, "A reel submitted by the editorial desk.",
                ArticleDesk.TRENDING_REELS, "Lucknow", null, null, null, null,
                "Editorial context for the linked reel.", version, "Original Instagram link verified.",
                "uttar-pradesh", null, url);
    }

    private String reviewBody(long version, ArticleDesk.Input input, boolean rightsVerified) throws Exception {
        return json.writeValueAsString(Map.of("articleVersion", version, "input", input,
                "changeSummary", "Update the story with newly checked details.",
                "verificationNotes", "Cross-checked the facts with the original statement and the reporting desk.",
                "checks", Map.of("factsVerified", true, "rightsVerified", rightsVerified, "standardsVerified", true)));
    }

    private UUID submit(ArticleDesk.Managed article, Accounts.Account actor, ArticleDesk.Input proposal) throws Exception {
        var response = mvc.perform(post("/api/admin/articles/"+article.id()+"/review")
                .with(user(actor.email())).with(verified(actor.email())).with(csrf())
                .contentType("application/json").content(reviewBody(article.version(), proposal, true)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("PENDING")).andReturn();
        return UUID.fromString(json.readTree(response.getResponse().getContentAsString()).path("id").asText());
    }

    private org.springframework.test.web.servlet.ResultActions approve(UUID id, Accounts.Account author) throws Exception {
        return approve(batchUrl(id, author), List.of(id));
    }

    private String batchUrl(UUID id, Accounts.Account author) {
        var day = jdbc.queryForObject("SELECT review_day FROM article_review_request WHERE id=?",
                (row, index) -> row.getObject(1, LocalDate.class), id);
        return "/api/admin/article-reviews/batches/"+author.id()+"/"+day;
    }

    private org.springframework.test.web.servlet.ResultActions approve(String batch, List<UUID> ids) throws Exception {
        return mvc.perform(post(batch+"/approve")
                .with(user(owner.email())).with(verified(owner.email())).with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(Map.of("ids", ids))));
    }

    private org.springframework.test.web.servlet.ResultActions reward(String batch) throws Exception {
        return mvc.perform(post(batch+"/reward").with(user(owner.email())).with(verified(owner.email())).with(csrf())
                .contentType("application/json").content(json.writeValueAsString(Map.of("note", "Recorded the owner's editorial recognition."))));
    }

    @Test void realLoginAndDraftPublicationRespectPermissionsAndCsrf() throws Exception {
        mvc.perform(formLogin("/api/auth/login").user("email",editor.email()).password(PASSWORD))
                .andExpect(status().isOk()).andExpect(cookie().httpOnly("UP24_ACCESS",true));
        assertThat(jdbc.queryForObject("SELECT password_hash FROM identity_account WHERE id=?",String.class,editor.id()))
                .startsWith("{bcrypt}");
        String slug = "workflow-" + UUID.randomUUID();
        String body = json.writeValueAsString(input(slug,"परीक्षण रिपोर्ट",null));
        mvc.perform(post("/api/admin/articles").with(user(reporter.email())).with(verified(reporter.email())).contentType("application/json").content(body))
                .andExpect(status().isForbidden());
        var result = mvc.perform(post("/api/admin/articles").with(user(reporter.email())).with(verified(reporter.email())).with(csrf())
                .contentType("application/json").content(body)).andExpect(status().isOk()).andReturn();
        var draft = json.readValue(result.getResponse().getContentAsString(),ArticleDesk.Managed.class);
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isNotFound());
        String publication = "{\"version\":0,\"published\":true,\"breaking\":false}";
        mvc.perform(post("/api/admin/articles/"+draft.id()+"/publication").with(user(reporter.email())).with(verified(reporter.email())).with(csrf())
                .contentType("application/json").content(publication)).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/articles/"+draft.id()+"/publication").with(user(editor.email())).with(verified(editor.email())).with(csrf())
                .contentType("application/json").content(publication)).andExpect(status().isForbidden());
        var review = submit(draft, reporter, input(slug,"परीक्षण रिपोर्ट",draft.version()));
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isNotFound());
        mvc.perform(put("/api/admin/articles/"+draft.id()).with(user(reporter.email())).with(verified(reporter.email())).with(csrf())
                .contentType("application/json").content(json.writeValueAsString(input(slug,"Late draft edit",draft.version()))))
                .andExpect(status().isConflict());
        approve(review, reporter).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("परीक्षण रिपोर्ट"));
        desk.publish(draft.id(),desk.find(draft.id()).orElseThrow().version(),false,false);
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isNotFound());
    }

    @Test void staleEditsAndPublicationCannotOverwriteNewerWorkAndRolesAreRechecked() throws Exception {
        var draft = desk.save(null,input("revision-"+UUID.randomUUID(),"Original",null),reporter.id(),reporter.displayName());
        var saved = desk.save(draft.id(),input(draft.article().slug(),"Newer report",0L),reporter.id(),reporter.displayName());
        mvc.perform(put("/api/admin/articles/"+draft.id()).with(user(reporter.email())).with(verified(reporter.email())).with(csrf()).contentType("application/json")
                .content(json.writeValueAsString(input(draft.article().slug(),"Stale report",0L))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.type").value("urn:up24:article-version-conflict"));
        mvc.perform(post("/api/admin/articles/"+draft.id()+"/publication").with(user(editor.email())).with(verified(editor.email())).with(csrf())
                .contentType("application/json").content("{\"version\":0,\"published\":true,\"breaking\":false}"))
                .andExpect(status().isForbidden());
        assertThat(desk.find(draft.id()).orElseThrow().article().title()).isEqualTo("Newer report");
        mvc.perform(get("/api/admin/articles/"+draft.id()).with(user(editor.email())).with(verified(editor.email()))).andExpect(status().isOk());
        jdbc.update("UPDATE identity_account SET role='SUBSCRIBER' WHERE id=?",editor.id());
        mvc.perform(get("/api/admin/articles/"+saved.id()).with(user(editor.email())).with(verified(editor.email()))).andExpect(status().isForbidden());
        var others = desk.save(null,input("private-"+UUID.randomUUID(),"Private",null),editor.id(),editor.displayName());
        mvc.perform(get("/api/admin/articles/"+others.id()).with(user(reporter.email())).with(verified(reporter.email()))).andExpect(status().isNotFound());
    }

    @Test void releasedArticleStaysPublicUnchangedUntilTheOwnersBatchDecision() throws Exception {
        var draft = desk.save(null,input("published-"+UUID.randomUUID(),"Original headline",null),reporter.id(),reporter.displayName());
        var article = desk.publish(draft.id(),draft.version(),true,true,owner.id());
        String slug = article.article().slug();
        var proposal = input(slug+"-corrected","Corrected headline",article.version());
        String staffEndpoint = "/api/admin/articles/"+article.id()+"/review";
        mvc.perform(put("/api/admin/articles/"+article.id()).with(user(editor.email())).with(verified(editor.email())).with(csrf())
                .contentType("application/json").content(json.writeValueAsString(proposal))).andExpect(status().isForbidden());
        mvc.perform(post(staffEndpoint).with(user(editor.email())).with(verified(editor.email())).with(csrf())
                .contentType("application/json").content(reviewBody(article.version(),proposal,false))).andExpect(status().isBadRequest());
        UUID review = submit(article,editor,proposal);
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Original headline"));
        mvc.perform(get("/api/articles/"+proposal.slug())).andExpect(status().isNotFound());
        mvc.perform(get(staffEndpoint).with(user(reporter.email())).with(verified(reporter.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reviews.length()").value(0));
        mvc.perform(get("/api/admin/article-reviews/"+review).with(user(editor.email())).with(verified(editor.email())))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/article-reviews/"+review).with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.kind").value("UPDATE"))
                .andExpect(jsonPath("$.input.title").value("Corrected headline"))
                .andExpect(jsonPath("$.current.article.title").value("Original headline"));
        approve(review, editor).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        var actual = desk.find(article.id()).orElseThrow().article();
        assertThat(actual.publishedAt()).isEqualTo(article.article().publishedAt());
        assertThat(actual.breaking()).isTrue();
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Corrected headline"));
        mvc.perform(get("/api/articles/"+proposal.slug())).andExpect(status().isOk());
    }

    @Test void removedContributorCannotBeApprovedAndCanReceiveAPrivateReturnDecision() throws Exception {
        var saved = desk.save(null,input("return-"+UUID.randomUUID(),"First draft",null),reporter.id(),reporter.displayName());
        UUID review = submit(saved,reporter,input(saved.article().slug(),"Returned proposal",saved.version()));
        String decision = "Confirm the original source before resubmitting.";
        jdbc.update("UPDATE identity_account SET role='SUBSCRIBER' WHERE id=?",reporter.id());
        approve(review,reporter).andExpect(status().isConflict());
        mvc.perform(post("/api/admin/article-reviews/"+review+"/return").with(user(owner.email())).with(verified(owner.email())).with(csrf())
                .contentType("application/json").content(json.writeValueAsString(Map.of("note",decision))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("RETURNED"));
        mvc.perform(get("/api/articles/"+saved.article().slug())).andExpect(status().isNotFound());
        jdbc.update("UPDATE identity_account SET role='REPORTER' WHERE id=?",reporter.id());
        mvc.perform(get("/api/admin/articles/"+saved.id()+"/review").with(user(reporter.email())).with(verified(reporter.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reviews[0].decisionNote").value(decision))
                .andExpect(jsonPath("$.latestInput.title").value("Returned proposal"));
        submit(saved,reporter,input(saved.article().slug(),"Revised proposal",saved.version()));
    }

    @Test void instagramReelLinksAreCanonicalAndStayPrivateUntilDailyApproval() throws Exception {
        String slug = "reel-" + UUID.randomUUID();
        String canonical = "https://www.instagram.com/reel/Editorial_test-42/";
        var draftInput = reel(slug, "https://instagram.com/reel/Editorial_test-42?igsh=tracking#share", null);
        var draftResponse = mvc.perform(post("/api/admin/articles").with(user(editor.email()))
                        .with(verified(editor.email())).with(csrf()).contentType("application/json")
                        .content(json.writeValueAsString(draftInput)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.article.reelUrl").value(canonical)).andReturn();
        var draft = json.readValue(draftResponse.getResponse().getContentAsString(), ArticleDesk.Managed.class);
        var invalid = reel(slug, "https://www.instagram.com.example.test/reel/Editorial_test-42/", draft.version());
        mvc.perform(post("/api/admin/articles/" + draft.id() + "/review").with(user(editor.email()))
                        .with(verified(editor.email())).with(csrf()).contentType("application/json")
                        .content(reviewBody(draft.version(), invalid, true)))
                .andExpect(status().isBadRequest());

        UUID review = submit(draft, editor, draftInput);
        mvc.perform(get("/api/articles/browse").param("category", ArticleDesk.TRENDING_REELS))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/admin/article-reviews/" + review).with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.input.reelUrl").value(canonical));

        approve(review, editor).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mvc.perform(get("/api/articles/browse").param("category", ArticleDesk.TRENDING_REELS))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].reelUrl").value(canonical));
        mvc.perform(get("/api/admin/articles/" + draft.id() + "/revisions/" + draft.version())
                        .with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.article.reelUrl").value(canonical));
    }

    @Test void dailyBatchRequiresExactPendingSetBeforeApprovalAndRecordsRewardOnlyOnce() throws Exception {
        var first = desk.save(null,input("first-"+UUID.randomUUID(),"First story",null),editor.id(),editor.displayName());
        var second = desk.save(null,input("second-"+UUID.randomUUID(),"Second story",null),editor.id(),editor.displayName());
        UUID firstReview = submit(first,editor,input(first.article().slug(),"First proposal",first.version()));
        UUID secondReview = submit(second,editor,input(second.article().slug(),"Second proposal",second.version()));
        String batch = batchUrl(firstReview, editor);
        assertThat(batchUrl(secondReview, editor)).isEqualTo(batch);
        reward(batch).andExpect(status().isConflict());
        approve(batch, List.of(firstReview)).andExpect(status().isConflict());
        approve(batch, List.of(firstReview, UUID.randomUUID())).andExpect(status().isConflict());
        mvc.perform(get("/api/articles/"+first.article().slug())).andExpect(status().isNotFound());
        mvc.perform(get(batch).with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.batch.pendingCount").value(2));
        approve(batch, List.of(firstReview, secondReview)).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
        mvc.perform(get("/api/articles/"+first.article().slug())).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("First proposal"));
        mvc.perform(get("/api/articles/"+second.article().slug())).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Second proposal"));
        reward(batch).andExpect(status().isOk()).andExpect(jsonPath("$.rewardedCount").value(2));
        reward(batch).andExpect(status().isConflict());
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
