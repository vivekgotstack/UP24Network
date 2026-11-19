package com.up24.news.article;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.identity.Accounts;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.ZoneId;
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
    private static final String STANDFIRST = "लखनऊ के निवासियों ने स्थानीय परिवहन में हुए बदलावों पर अपनी राय दी।";
    private static final String REPORT = """
            नगर निगम की बैठक में मंगलवार को स्थानीय बसों की समय सारिणी पर चर्चा हुई। विभाग ने सुबह और शाम की सेवाओं के लिए यात्रियों से सुझाव माँगे। समिति ने कहा कि अगली बैठक में उपलब्ध आँकड़े सार्वजनिक किए जाएंगे।

            स्थानीय निवासियों ने बताया कि मुख्य मार्ग पर पहली बस के समय में बदलाव की आवश्यकता है। विद्यालय जाने वाले बच्चों और कामकाजी यात्रियों ने अपने अनुभव साझा किए। परिवहन विभाग ने उन मार्गों की सूची जारी की है जिन पर सर्वेक्षण होगा।

            रिपोर्टिंग टीम ने बस अड्डे पर तैनात कर्मचारियों से प्रस्तावित समय की पुष्टि की और बैठक का कार्यवृत्त देखा। योजना पर अंतिम निर्णय अभी बाकी है। विभाग ने कहा कि यात्री अगले सप्ताह तक आधिकारिक वेबसाइट पर अपने सुझाव दर्ज कर सकते हैं।
            """;
    private static final List<String> TOPICS = List.of("Local transit", "नगर बस सेवा");
    private static final String PHOTO_CREDIT = "UP24Network photo desk";

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
        return new ArticleDesk.Input(title,slug,STANDFIRST,"Uttar Pradesh","Lucknow",
                "/images/newsroom.jpg","UP24Network newsroom",null,null,REPORT,version,
                "Checked the published council minutes and interviewed a bus dispatcher.","uttar-pradesh",null,null,null,TOPICS,PHOTO_CREDIT);
    }

    private ArticleDesk.Input reel(String slug, String url, Long version) {
        return new ArticleDesk.Input("Instagram report", slug, "A reel submitted by the editorial desk.",
                ArticleDesk.TRENDING_REELS, "Lucknow", null, null, null, null,
                "The verified leading creator documented the village fair and shared its schedule with visitors.",
                version, "Original Instagram link verified.", "uttar-pradesh", null, url, null,
                List.of("Local fairs", "Instagram"), "Original Instagram creator");
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

    private org.springframework.test.web.servlet.ResultActions release(ArticleDesk.Managed article, Accounts.Account actor,
            ArticleDesk.Input proposal, boolean rightsVerified) throws Exception {
        return mvc.perform(post("/api/admin/articles/" + article.id() + "/editor-publication")
                .with(user(actor.email())).with(verified(actor.email())).with(csrf())
                .contentType("application/json").content(reviewBody(article.version(), proposal, rightsVerified)));
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

    @Test void englishTranslationPublishesThroughReviewAndSurvivesALegacyEdit() throws Exception {
        String slug = "translated-report-" + UUID.randomUUID();
        var draft = desk.save(null, input(slug, "स्थानीय समाचार", null), reporter.id(), reporter.displayName());
        var proposal = new ArticleDesk.Input("स्थानीय समाचार", slug, STANDFIRST, "Uttar Pradesh", "Lucknow",
                "/images/newsroom.jpg", "UP24Network newsroom", null, null, REPORT, draft.version(),
                "Checked the council minutes and interviewed a dispatcher.", "uttar-pradesh", null, null,
                new ArticleDesk.EnglishInput("Local report", "A translated summary.", "First paragraph.\n\nSecond paragraph.", null),
                List.of("Local transit", "local transit", "नगर बस सेवा"), PHOTO_CREDIT);
        UUID review = submit(draft, reporter, proposal);
        mvc.perform(get("/api/articles/" + slug)).andExpect(status().isNotFound());
        approve(review, reporter).andExpect(status().isOk());
        var published = desk.find(draft.id()).orElseThrow();
        var legacyEdit = new ArticleDesk.Input(proposal.title(),slug,STANDFIRST,proposal.category(),proposal.city(),
                proposal.image(),proposal.imageAlt(),null,null,REPORT,published.version(),proposal.sourceNotes(),proposal.region());
        desk.save(draft.id(), legacyEdit, owner.id(), owner.displayName());
        mvc.perform(get("/api/articles/" + slug)).andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("स्थानीय समाचार"))
                .andExpect(jsonPath("$.english.title").value("Local report"))
                .andExpect(jsonPath("$.english.paragraphs[1]").value("Second paragraph."))
                .andExpect(jsonPath("$.tags.length()").value(2))
                .andExpect(jsonPath("$.mediaCredit").value(PHOTO_CREDIT))
                .andExpect(jsonPath("$.sourceNotes").doesNotExist());
        mvc.perform(get("/api/articles/browse").param("q", "translated summary नगर बस सेवा"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].english.title").value("Local report"));
    }

    @Test void readershipCountsPublishedVisitsFromSubscribersAndGuestsOnly() throws Exception {
        var reader = accounts.create(UUID.randomUUID() + "@reader.test", "Test reader", PASSWORD, Accounts.Role.SUBSCRIBER);
        String slug = "reader-views-" + UUID.randomUUID();
        var draft = desk.save(null, input(slug,"Reader report",null), owner.id(), owner.displayName());
        var view = "/api/articles/" + slug + "/view";
        mvc.perform(post(view).with(csrf())).andExpect(status().isNoContent());
        var published = desk.publish(draft.id(), draft.version(), true, false, owner.id());
        desk.save(draft.id(), input(slug + "-updated", "Reader report", published.version()), owner.id(), owner.displayName());

        mvc.perform(post(view)).andExpect(status().isForbidden());
        mvc.perform(post(view).with(csrf())).andExpect(status().isNoContent());
        var login = mvc.perform(formLogin("/api/auth/login").user("email",reader.email()).password(PASSWORD))
                .andExpect(status().isOk()).andReturn().getResponse();
        mvc.perform(post(view).cookie(login.getCookie("UP24_ACCESS")).with(csrf())).andExpect(status().isNoContent());
        for (var staff : List.of(editor, reporter, owner)) {
            mvc.perform(post(view).with(user(staff.email())).with(csrf())).andExpect(status().isNoContent());
        }
        mvc.perform(post(view).cookie(new Cookie("UP24_REFRESH", "unresolved")).with(csrf())).andExpect(status().isNoContent());

        var today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        assertThat(jdbc.queryForObject("SELECT view_count FROM article_readership_day WHERE article_id=? AND view_day=?",
                Long.class, draft.id(), today)).isEqualTo(2L);
        int anotherMonth = today.getMonthValue() == 1 ? 2 : 1;
        jdbc.update("INSERT INTO article_readership_day(article_id,view_day,view_count) VALUES (?,?,?)", draft.id(),
                LocalDate.of(today.getYear(), anotherMonth, 1), 3L);
        jdbc.update("INSERT INTO article_readership_day(article_id,view_day,view_count) VALUES (?,?,?)", draft.id(),
                today.minusYears(1), 7L);

        String report = "/api/admin/readership";
        mvc.perform(get(report).with(user(reader.email()))).andExpect(status().isForbidden());
        mvc.perform(get(report).with(user(owner.email())).with(verified(owner.email())).param("q", slug))
                .andExpect(status().isOk()).andExpect(jsonPath("$.year").value(today.getYear()))
                .andExpect(jsonPath("$.month").value(today.getMonthValue()))
                .andExpect(jsonPath("$.monthViews").value(2)).andExpect(jsonPath("$.yearViews").value(5))
                .andExpect(jsonPath("$.items[0].slug").value(slug + "-updated"))
                .andExpect(jsonPath("$.items[0].monthViews").value(2))
                .andExpect(jsonPath("$.items[0].yearViews").value(5))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test void creatingAContinuationKeepsTheSourcePublicAndTheNewEditionPrivateUntilApproval() throws Exception {
        String slug = "first-edition-" + UUID.randomUUID();
        var source = desk.save(null, input(slug, "Original report", null), owner.id(), owner.displayName());
        desk.publish(source.id(), source.version(), true, false, owner.id());
        String create = "/api/admin/articles/" + source.id() + "/continuations";
        mvc.perform(post(create).with(user(reporter.email())).with(verified(reporter.email())).with(csrf()))
                .andExpect(status().isNotFound());
        var created = mvc.perform(post(create).with(user(editor.email())).with(verified(editor.email())).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.version").value(0)).andExpect(jsonPath("$.editionNumber").value(2))
                .andExpect(jsonPath("$.continuationRootId").value(source.id().toString()))
                .andExpect(jsonPath("$.sourceNotes").value(""))
                .andExpect(jsonPath("$.article.author").value(editor.displayName()))
                .andReturn().getResponse();
        var draft = json.readValue(created.getContentAsByteArray(), ArticleDesk.Managed.class);
        assertThat(draft.id()).isNotEqualTo(source.id());
        assertThat(draft.article().slug()).isNotEqualTo(slug);
        assertThat(draft.article().paragraphs()).isEqualTo(source.article().paragraphs());
        String continuation = "/api/articles/" + draft.article().slug();
        mvc.perform(get(continuation)).andExpect(status().isNotFound());
        release(draft, editor, input(draft.article().slug(), "Follow-up report", draft.version()), true)
                .andExpect(status().isOk());
        mvc.perform(get(continuation)).andExpect(status().isOk())
                .andExpect(jsonPath("$.editionNumber").value(2)).andExpect(jsonPath("$.continuationOfSlug").value(slug));
        mvc.perform(get("/api/articles/" + slug)).andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Original report")).andExpect(jsonPath("$.editionNumber").value(1));
        mvc.perform(post("/api/admin/articles/" + draft.id() + "/continuations")
                .with(user(editor.email())).with(verified(editor.email())).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.editionNumber").value(3))
                .andExpect(jsonPath("$.continuationRootId").value(source.id().toString()));
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
        String batches = "/api/admin/article-reviews/batches?page=1";
        mvc.perform(get(batches).with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].contributorId", org.hamcrest.Matchers.hasItem(reporter.id().toString())));
        mvc.perform(get(batches).with(user(editor.email())).with(verified(editor.email())))
                .andExpect(status().isForbidden());
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
        mvc.perform(post(staffEndpoint).with(user(reporter.email())).with(verified(reporter.email())).with(csrf())
                .contentType("application/json").content(reviewBody(article.version(),proposal,false))).andExpect(status().isBadRequest());
        UUID review = submit(article,reporter,proposal);
        release(article, editor, proposal, true).andExpect(status().isConflict());
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Original headline"));
        mvc.perform(get("/api/articles/"+proposal.slug())).andExpect(status().isNotFound());
        mvc.perform(get(staffEndpoint).with(user(editor.email())).with(verified(editor.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reviews.length()").value(0));
        mvc.perform(get("/api/admin/article-reviews/"+review).with(user(editor.email())).with(verified(editor.email())))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/article-reviews/"+review).with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.kind").value("UPDATE"))
                .andExpect(jsonPath("$.input.title").value("Corrected headline"))
                .andExpect(jsonPath("$.current.article.title").value("Original headline"));
        approve(review, reporter).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        var actual = desk.find(article.id()).orElseThrow().article();
        assertThat(actual.publishedAt()).isEqualTo(article.article().publishedAt());
        assertThat(actual.breaking()).isTrue();
        mvc.perform(get("/api/articles/"+slug)).andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Corrected headline"))
                .andExpect(jsonPath("$.updatedBy").value(reporter.displayName()));
        mvc.perform(get("/api/articles/"+proposal.slug())).andExpect(status().isOk());
        var activity = "/api/admin/articles/"+article.id()+"/activity";
        mvc.perform(get(activity).with(user(editor.email())).with(verified(editor.email())))
                .andExpect(status().isForbidden());
        mvc.perform(get(activity).with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.action == 'SUBMIT_REVIEW')].actor.name").value(org.hamcrest.Matchers.hasItem(reporter.displayName())));
    }

    @Test void trustedEditorPublishesAndCorrectsWithPrivateEvidenceWithoutADailyReview() throws Exception {
        String slug = "editor-release-" + UUID.randomUUID();
        var draft = desk.save(null, input(slug, "Draft headline", null), reporter.id(), reporter.displayName());
        var proposal = input(slug, "Published headline", draft.version());
        String reviews = "/api/admin/articles/" + draft.id() + "/review";
        mvc.perform(post(reviews).with(user(editor.email())).with(verified(editor.email())).with(csrf())
                .contentType("application/json").content(reviewBody(draft.version(), proposal, true)))
                .andExpect(status().isForbidden());
        release(draft, reporter, proposal, true).andExpect(status().isForbidden());
        release(draft, editor, proposal, false).andExpect(status().isBadRequest());
        mvc.perform(get("/api/articles/" + slug)).andExpect(status().isNotFound());
        release(draft, editor, proposal, true).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.article.author").value(reporter.displayName()));
        release(draft, editor, proposal, true).andExpect(status().isConflict());

        var published = desk.find(draft.id()).orElseThrow();
        release(published, editor, input(slug + "-changed", "Changed article address", published.version()), true)
                .andExpect(status().isForbidden());
        release(published, editor, input(slug, "Corrected headline", published.version()), true)
                .andExpect(status().isOk()).andExpect(jsonPath("$.article.updatedBy").value(editor.displayName()));
        mvc.perform(get("/api/articles/" + slug)).andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Corrected headline"))
                .andExpect(jsonPath("$.author").value(reporter.displayName()))
                .andExpect(jsonPath("$.publishedAt").value(published.article().publishedAt().toString()))
                .andExpect(jsonPath("$.evidence").doesNotExist());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM article_review_request WHERE article_id=?", Integer.class, draft.id()))
                .isZero();
        String activity = "/api/admin/articles/" + draft.id() + "/activity";
        mvc.perform(get(activity).with(user(editor.email())).with(verified(editor.email())))
                .andExpect(status().isForbidden());
        mvc.perform(get(activity).with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.action == 'EDITOR_RELEASE')].evidence.changeSummary").value(
                        org.hamcrest.Matchers.hasItem("Update the story with newly checked details.")))
                .andExpect(jsonPath("$[?(@.action == 'EDITOR_UPDATE')].evidence.verificationNotes").value(
                        org.hamcrest.Matchers.hasItem("Cross-checked the facts with the original statement and the reporting desk.")));
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
        var draftResponse = mvc.perform(post("/api/admin/articles").with(user(reporter.email()))
                        .with(verified(reporter.email())).with(csrf()).contentType("application/json")
                        .content(json.writeValueAsString(draftInput)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.article.reelUrl").value(canonical)).andReturn();
        var draft = json.readValue(draftResponse.getResponse().getContentAsString(), ArticleDesk.Managed.class);
        var invalid = reel(slug, "https://www.instagram.com.example.test/reel/Editorial_test-42/", draft.version());
        mvc.perform(post("/api/admin/articles/" + draft.id() + "/review").with(user(reporter.email()))
                        .with(verified(reporter.email())).with(csrf()).contentType("application/json")
                        .content(reviewBody(draft.version(), invalid, true)))
                .andExpect(status().isBadRequest());

        UUID review = submit(draft, reporter, draftInput);
        mvc.perform(get("/api/articles/browse").param("category", ArticleDesk.TRENDING_REELS))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/admin/article-reviews/" + review).with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.input.reelUrl").value(canonical));

        approve(review, reporter).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mvc.perform(get("/api/articles/browse").param("category", ArticleDesk.TRENDING_REELS))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].reelUrl").value(canonical));
        mvc.perform(get("/api/admin/articles/" + draft.id() + "/revisions/" + draft.version())
                        .with(user(owner.email())).with(verified(owner.email())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.article.reelUrl").value(canonical));
    }

    @Test void dailyBatchRequiresExactPendingSetBeforeApprovalAndRecordsRewardOnlyOnce() throws Exception {
        var first = desk.save(null,input("first-"+UUID.randomUUID(),"First story",null),reporter.id(),reporter.displayName());
        var second = desk.save(null,input("second-"+UUID.randomUUID(),"Second story",null),reporter.id(),reporter.displayName());
        UUID firstReview = submit(first,reporter,input(first.article().slug(),"First proposal",first.version()));
        UUID secondReview = submit(second,reporter,input(second.article().slug(),"Second proposal",second.version()));
        String batch = batchUrl(firstReview, reporter);
        assertThat(batchUrl(secondReview, reporter)).isEqualTo(batch);
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
