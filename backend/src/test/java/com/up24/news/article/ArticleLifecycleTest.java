package com.up24.news.article;

import com.up24.news.identity.Accounts;
import com.up24.news.support.VerifiedLogin;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email=","up24.newsroom.admin-email=owner@lifecycle.test"})
@AutoConfigureMockMvc
@Transactional
class ArticleLifecycleTest {
    @Autowired ArticleDesk desk;
    @Autowired ArticleLifecycle lifecycle;
    @Autowired ArticleMediaUsage media;
    @Autowired Accounts accounts;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    private Accounts.Account owner;
    private Accounts.Account reporter;

    @BeforeEach void actors() {
        owner=accounts.create("owner@lifecycle.test","Owner","Lifecycle-local-password!",Accounts.Role.ADMIN);
        reporter=accounts.create(UUID.randomUUID()+"@reporter.test","Reporter","Lifecycle-local-password!",Accounts.Role.REPORTER);
    }
    private ArticleDesk.Input input(String slug,String title,Long version,String image) {
        return new ArticleDesk.Input(title,slug,"Useful summary","India","Lucknow",image,"Report photograph",null,null,
                "A complete original paragraph.\n\nThe second paragraph.",version,"Verified source notes","uttar-pradesh");
    }
    @Test void historyRestoresContentAsDraftAndArchiveRemovesPublicAccess() {
        var original=desk.save(null,input("history-"+UUID.randomUUID(),"Original",null,"/images/original.jpg"),reporter.id(),reporter.displayName());
        var edited=desk.save(original.id(),input(original.article().slug(),"Edited",0L,"/images/new.jpg"),owner.id(),owner.displayName());
        assertThat(lifecycle.revisions(edited.id())).singleElement().satisfies(revision -> {
            assertThat(revision.version()).isZero(); assertThat(revision.title()).isEqualTo("Original"); assertThat(revision.actorId()).isEqualTo(owner.id());
        });
        assertThat(lifecycle.revision(edited.id(),0).article().paragraphs()).hasSize(2);
        assertThat(media.inUse("/images/original.jpg")).isTrue();
        var published=desk.publish(edited.id(),edited.version(),true,true,owner.id());
        assertThat(desk.published().stream().filter(row -> row.slug().equals(original.article().slug())).findFirst().orElseThrow().paragraphs()).isEmpty();
        assertThat(desk.findPublished(original.article().slug()).orElseThrow().paragraphs()).hasSize(2);
        var archived=lifecycle.change(published.id(),published.version(),ArticleLifecycle.Action.ARCHIVE,owner.id());
        assertThat(desk.findPublished(original.article().slug())).isEmpty();
        var restored=lifecycle.change(archived.id(),archived.version(),ArticleLifecycle.Action.RESTORE,owner.id());
        assertThat(restored.status()).isEqualTo("DRAFT");
        var historical=lifecycle.restoreRevision(restored.id(),0,restored.version(),owner.id());
        assertThat(historical.article().title()).isEqualTo("Original");
        assertThat(historical.status()).isEqualTo("DRAFT");
        assertThat(historical.article().breaking()).isFalse();
        assertThat(historical.version()).isEqualTo(restored.version()+1);
        var current=historical;
        for(int index=0;index<22;index++) current=desk.save(current.id(),input(current.article().slug(),"Revision "+index,current.version(),"/images/new.jpg"),owner.id(),owner.displayName());
        assertThat(lifecycle.revisions(current.id())).hasSize(20);
        assertThat(media.inUse("/images/original.jpg")).isFalse();
    }
    @Test void onlyAdminCanDeleteAndPurgePreventsAutomaticResurrection() throws Exception {
        var key="lifecycle:"+UUID.randomUUID();
        var imported=new ArticleDesk.Imported(key,"import-"+UUID.randomUUID(),"Imported report","Summary","India","Lucknow",
                "/images/report.jpg","Report photograph",null,null,List.of("Original imported paragraph."),Instant.now().minusSeconds(60),false,null,"uttar-pradesh");
        assertThat(desk.importPublished(imported)).isTrue();
        assertThat(desk.importPublished(imported)).isFalse();
        var id=UUID.nameUUIDFromBytes(key.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(desk.find(id).orElseThrow().version()).isZero();
        mvc.perform(post("/api/admin/articles/"+id+"/lifecycle").with(VerifiedLogin.verified(reporter,jdbc,Instant.now())).with(csrf())
                .contentType("application/json").content("{\"version\":0,\"action\":\"TRASH\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/articles/"+id+"/lifecycle").with(VerifiedLogin.verified(owner,jdbc,Instant.now())).with(csrf())
                .contentType("application/json").content("{\"version\":99,\"action\":\"TRASH\"}")).andExpect(status().isConflict());
        assertThatThrownBy(() -> lifecycle.purge(id,0,owner.id())).isInstanceOf(ArticleOperationException.class);
        var trashed=lifecycle.change(id,0,ArticleLifecycle.Action.TRASH,owner.id());
        assertThat(lifecycle.browse(null,"TRASH","",1,20).items()).extracting(ArticleDesk.Managed::id).contains(id);
        assertThat(lifecycle.browse(null,"TRASH","",1,20).items()).allSatisfy(row -> { assertThat(row.article().paragraphs()).isEmpty(); assertThat(row.sourceNotes()).isEmpty(); });
        lifecycle.purge(id,trashed.version(),owner.id());
        assertThat(desk.find(id)).isEmpty();
        assertThat(desk.importPublished(imported)).isFalse();
        assertThat(lifecycle.activity(id)).extracting(ArticleLifecycle.Activity::action).contains("PURGE");
        assertThat(media.inUse("/images/report.jpg")).isFalse();
    }
}
