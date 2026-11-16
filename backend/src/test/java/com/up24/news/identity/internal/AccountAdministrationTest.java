package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import com.up24.news.support.VerifiedLogin;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email=", "up24.newsroom.admin-email=owner@accounts.test"})
@AutoConfigureMockMvc
@Transactional
class AccountAdministrationTest {
    @Autowired Accounts accounts;
    @Autowired LoginSessions sessions;
    @Autowired JwtDecoder decoder;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;

    @Test void ownerIsProtectedAndStaffSuspensionRevokesTokensWhileDeletionPreservesBylines() throws Exception {
        String password="Account-fixture-password-2026!";
        var owner=accounts.create("owner@accounts.test","Owner",password,Accounts.Role.ADMIN);
        var reporter=accounts.create("staff@accounts.test","Field Reporter",password,Accounts.Role.REPORTER);
        accounts.create("reader@accounts.test","Reader",password,Accounts.Role.SUBSCRIBER);
        var authorization=VerifiedLogin.verified(owner,jdbc,Instant.now());
        var login=sessions.start(reporter);
        assertThat(decoder.decode(login.access()).getSubject()).isEqualTo(reporter.id().toString());
        var article=UUID.randomUUID();
        jdbc.update("INSERT INTO article_record(id,slug,title,summary,category,author,author_id) VALUES (?,?,?,?,?,?,?)",
                article,"account-history-"+article,"Historical report","Summary","India","Historical byline",reporter.id());

        mvc.perform(get("/api/admin/accounts/browse").param("scope","STAFF").param("q","field").with(authorization))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].enabled").value(true)).andExpect(jsonPath("$.items[0].passwordHash").doesNotExist());
        mvc.perform(patch("/api/admin/accounts/"+owner.id()+"/profile").with(authorization).with(csrf())
                .contentType("application/json").content("{\"displayName\":\"Owner\",\"enabled\":false,\"version\":0}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/admin/accounts/"+reporter.id()+"/profile").with(authorization).with(csrf())
                .contentType("application/json").content("{\"displayName\":\"Updated reporter\",\"enabled\":false,\"version\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.enabled").value(false));
        assertThatThrownBy(() -> decoder.decode(login.access())).isInstanceOf(JwtException.class);
        mvc.perform(formLogin("/api/auth/login").user("email",reporter.email()).password(password)).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/admin/accounts/"+reporter.id()+"/profile").with(authorization).with(csrf())
                .contentType("application/json").content("{\"displayName\":\"Stale\",\"enabled\":true,\"version\":0}"))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/admin/accounts/"+owner.id()).with(authorization).with(csrf())
                .contentType("application/json").content("{\"version\":0}")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/admin/accounts/"+reporter.id()).with(authorization).with(csrf())
                .contentType("application/json").content("{\"version\":1}")).andExpect(status().isNoContent());
        assertThat(accounts.find(reporter.id())).isEmpty();
        assertThat(jdbc.queryForObject("SELECT author FROM article_record WHERE id=?",String.class,article)).isEqualTo("Historical byline");
    }
}
