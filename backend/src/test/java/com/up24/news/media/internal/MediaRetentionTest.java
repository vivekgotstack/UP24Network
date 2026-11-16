package com.up24.news.media.internal;

import com.up24.news.identity.Accounts;
import com.up24.news.support.VerifiedLogin;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"up24.media.storage=local","up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email=","up24.newsroom.admin-email=media-owner@identity.test"})
@AutoConfigureMockMvc
@Transactional
class MediaRetentionTest {
    @Autowired Accounts accounts;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Test void onlyVerifiedAdminCanSaveVersionedPoliciesAndNoAwsAccountIsNeededForPreview() throws Exception {
        var owner=accounts.create("media-owner@identity.test","Owner","Media-owner-password-2026!",Accounts.Role.ADMIN);
        var reporter=accounts.create("media-reporter@identity.test","Reporter","Media-reporter-password-2026!",Accounts.Role.REPORTER);
        var admin=VerifiedLogin.verified(owner,jdbc,Instant.now());
        mvc.perform(get("/api/admin/media/storage")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/media/storage").with(VerifiedLogin.verified(reporter,jdbc,Instant.now()))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/media/storage").with(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadBackend").value("LOCAL")).andExpect(jsonPath("$.s3Configured").value(false))
                .andExpect(jsonPath("$.policy.transitionDays").value(365)).andExpect(jsonPath("$.secretAccessKey").doesNotExist());
        String input="{\"enabled\":true,\"transitionDays\":365,\"version\":0}";
        mvc.perform(put("/api/admin/media/storage").with(admin).contentType("application/json").content(input)).andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/media/storage").with(admin).with(csrf()).contentType("application/json").content(input))
                .andExpect(status().isOk()).andExpect(jsonPath("$.policy.enabled").value(true)).andExpect(jsonPath("$.policy.version").value(1));
        mvc.perform(put("/api/admin/media/storage").with(admin).with(csrf()).contentType("application/json").content(input)).andExpect(status().isConflict());
        mvc.perform(post("/api/admin/media/storage/sync").with(admin).with(csrf())).andExpect(status().isBadRequest());
        String id="c".repeat(64);
        jdbc.update("INSERT INTO media_asset(id,original_name,bytes,original_bytes,width,height,object_key) VALUES (?,'Fixture',100,100,1,1,?)",id,id+".webp");
        mvc.perform(patch("/api/admin/media/"+id+"/retention").with(admin).with(csrf()).contentType("application/json").content("{\"eligible\":false,\"version\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.archiveEligible").value(false)).andExpect(jsonPath("$.version").value(1));
        mvc.perform(patch("/api/admin/media/"+id+"/retention").with(admin).with(csrf()).contentType("application/json").content("{\"eligible\":true,\"version\":0}"))
                .andExpect(status().isConflict());
    }
}
