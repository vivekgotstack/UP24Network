package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import com.up24.news.notification.LoginCodeDelivery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email=",
        "up24.newsroom.owner-email=owner@identity.test",
        "up24.newsroom.otp-secret=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"})
@AutoConfigureMockMvc
@Transactional
@Import(NewsroomOtpIntegrationTest.MailFixture.class)
class NewsroomOtpIntegrationTest {
    @TestConfiguration static class MailFixture {
        @Bean @Primary CapturedMail capturedMail() { return new CapturedMail(); }
    }
    static class CapturedMail implements LoginCodeDelivery {
        String code;
        @Override public boolean configured() { return true; }
        @Override public void send(String recipient,String code,Instant expiresAt) { this.code=code; }
    }
    @Autowired Accounts accounts;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CapturedMail mail;
    @Autowired EmailOtpService otp;
    private static final String OWNER="owner@identity.test";
    private static final String PASSWORD="Identity-local-test-2026!";
    @BeforeEach void accounts() {
        accounts.create(OWNER,"Owner",PASSWORD,Accounts.Role.ADMIN);
        accounts.create("reporter@identity.test","Reporter",PASSWORD,Accounts.Role.REPORTER);
        accounts.create("reader@identity.test","Reader",PASSWORD,Accounts.Role.SUBSCRIBER);
    }

    @Test void passwordAloneDoesNotOpenNewsroomAndCodeIsSessionBoundAndSingleUse() throws Exception {
        var login=mvc.perform(formLogin("/api/auth/login").user("email",OWNER).password(PASSWORD)).andExpect(status().isOk()).andReturn();
        var session=(MockHttpSession)login.getRequest().getSession(false);
        mvc.perform(get("/api/admin/accounts").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/newsroom/code").session(session).with(csrf())).andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresAt").exists()).andExpect(jsonPath("$.code").doesNotExist());
        String code=mail.code;
        assertThat(code).matches("[0-9]{6}");
        assertThat(jdbc.queryForObject("SELECT code_digest FROM identity_newsroom_otp WHERE email=?",String.class,OWNER)).hasSize(64).doesNotContain(code);
        mvc.perform(post("/api/auth/newsroom/verify").with(user(OWNER)).with(csrf()).session(new MockHttpSession())
                .contentType("application/json").content("{\"code\":\""+code+"\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/newsroom/verify").session(session).with(csrf())
                .contentType("application/json").content("{\"code\":\""+code+"\"}")).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(jsonPath("$.newsroomAccess").value(true));
        mvc.perform(get("/api/admin/accounts").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/newsroom/verify").session(session).with(csrf())
                .contentType("application/json").content("{\"code\":\""+code+"\"}")).andExpect(status().isUnauthorized());
    }

    @Test void attemptsExpiryAndResendLimitsPersistAndReadersCannotRequestCodes() throws Exception {
        String email="reporter@identity.test";
        otp.issue(email,"test-session");
        String code=mail.code;
        String wrong=code.equals("000000")?"000001":"000000";
        for(int attempt=0;attempt<5;attempt++) assertThat(otp.verify(email,"test-session",wrong)).isFalse();
        assertThat(otp.verify(email,"test-session",code)).isFalse();
        assertThat(jdbc.queryForObject("SELECT attempts FROM identity_newsroom_otp WHERE email=?",Integer.class,email)).isEqualTo(5);
        assertThatThrownBy(()->otp.issue(email,"test-session")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        jdbc.update("UPDATE identity_newsroom_otp SET attempts=0,expires_at=CURRENT_TIMESTAMP-INTERVAL '1 minute' WHERE email=?",email);
        assertThat(otp.verify(email,"test-session",code)).isFalse();
        mvc.perform(post("/api/auth/newsroom/code").with(user("reader@identity.test")).with(csrf())).andExpect(status().isForbidden());
        assertThatThrownBy(()->accounts.create("other-admin@identity.test","Other",PASSWORD,Accounts.Role.ADMIN))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
