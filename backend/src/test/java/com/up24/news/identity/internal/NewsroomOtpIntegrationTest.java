package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import com.up24.news.identity.AccountException;
import jakarta.servlet.http.Cookie;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email=",
        "up24.newsroom.admin-email=owner@identity.test",
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
    @Autowired JwtDecoder jwtDecoder;
    @Autowired JwtEncoder jwtEncoder;
    private static final String OWNER="owner@identity.test";
    private static final String PASSWORD="Identity-local-test-2026!";
    @BeforeEach void accounts() {
        accounts.create(OWNER,"Owner",PASSWORD,Accounts.Role.ADMIN);
        accounts.create("reporter@identity.test","Reporter",PASSWORD,Accounts.Role.REPORTER);
        accounts.create("reader@identity.test","Reader",PASSWORD,Accounts.Role.SUBSCRIBER);
    }

    private Cookie[] login(String email) throws Exception {
        var result=mvc.perform(formLogin("/api/auth/login").user("email",email).password(PASSWORD))
                .andExpect(status().isOk()).andExpect(cookie().httpOnly(TokenCookies.ACCESS,true))
                .andExpect(cookie().httpOnly(TokenCookies.REFRESH,true)).andReturn();
        assertThat(result.getRequest().getSession(false)).isNull();
        return new Cookie[]{result.getResponse().getCookie(TokenCookies.ACCESS),result.getResponse().getCookie(TokenCookies.REFRESH)};
    }

    @Test void passwordAloneDoesNotOpenNewsroomAndCodeIsSessionBoundAndSingleUse() throws Exception {
        var session=login(OWNER);
        mvc.perform(get("/api/admin/accounts").cookie(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/newsroom/code").cookie(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/newsroom/code").cookie(session).with(csrf())).andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresAt").exists()).andExpect(jsonPath("$.code").doesNotExist());
        String code=mail.code;
        assertThat(code).matches("[0-9]{6}");
        assertThat(jdbc.queryForObject("SELECT code_digest FROM identity_newsroom_otp WHERE email=?",String.class,OWNER)).hasSize(64).doesNotContain(code);
        mvc.perform(post("/api/auth/newsroom/verify").cookie(login(OWNER)).with(csrf())
                .contentType("application/json").content("{\"code\":\""+code+"\"}")).andExpect(status().isUnauthorized());
        var steppedUp=mvc.perform(post("/api/auth/newsroom/verify").cookie(session).with(csrf())
                .contentType("application/json").content("{\"code\":\""+code+"\"}")).andExpect(status().isNoContent()).andReturn();
        mvc.perform(get("/api/auth/me").cookie(session)).andExpect(status().isUnauthorized());
        session=new Cookie[]{steppedUp.getResponse().getCookie(TokenCookies.ACCESS),steppedUp.getResponse().getCookie(TokenCookies.REFRESH)};
        mvc.perform(get("/api/auth/me").cookie(session)).andExpect(jsonPath("$.newsroomAccess").value(true));
        mvc.perform(get("/api/admin/accounts").cookie(session)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/newsroom/verify").cookie(session).with(csrf())
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
                .isInstanceOf(AccountException.class);
    }

    @Test void refreshRotatesAndReplayRevokesTheWholeLogin() throws Exception {
        var original=login(OWNER);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM identity_refresh_token WHERE digest=?",Integer.class,
                LoginSessions.digest(original[1].getValue()))).isEqualTo(1);
        var rotated=mvc.perform(post("/api/auth/refresh").cookie(original).with(csrf()))
                .andExpect(status().isNoContent()).andReturn();
        var access=rotated.getResponse().getCookie(TokenCookies.ACCESS);
        var refresh=rotated.getResponse().getCookie(TokenCookies.REFRESH);
        assertThat(access.getValue()).isNotEqualTo(original[0].getValue());
        assertThat(refresh.getValue()).isNotEqualTo(original[1].getValue());
        mvc.perform(get("/api/auth/me").cookie(access)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/refresh").cookie(original).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").cookie(access)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").cookie(refresh).with(csrf())).andExpect(status().isUnauthorized());
    }

    @Test void logoutRevokesImmediatelyAndLogoutEverywhereRevokesOtherDevices() throws Exception {
        var first=login(OWNER); var second=login(OWNER); var third=login(OWNER);
        mvc.perform(post("/api/auth/logout").cookie(first)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").cookie(first).with(csrf())).andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(TokenCookies.ACCESS,0)).andExpect(cookie().maxAge(TokenCookies.REFRESH,0));
        mvc.perform(get("/api/auth/me").cookie(first)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").cookie(second)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout-all").cookie(second).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").cookie(second)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").cookie(third)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").cookie(first).with(csrf())).andExpect(status().isUnauthorized());
    }

    @Test void publicRegistrationCannotClaimTheOwnerOrAssignStaffRoles() throws Exception {
        var body="{\"email\":\"new-reader@identity.test\",\"displayName\":\"Reader\",\"password\":\""+PASSWORD+"\",\"role\":\"ADMIN\"}";
        mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("SUBSCRIBER"))
                .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.passwordHash").doesNotExist());
        // The address is reserved even in an empty database before bootstrap.
        jdbc.update("DELETE FROM identity_account WHERE email=?",OWNER);
        mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(body.replace("new-reader@identity.test",OWNER)))
                .andExpect(status().isConflict());
        assertThatThrownBy(() -> accounts.create("invalid-email"," ",PASSWORD,Accounts.Role.REPORTER)).isInstanceOf(AccountException.class);
    }

    @Test void signedTokensRequireCorrectIssuerAudienceExpiryAndSignature() throws Exception {
        var session=login(OWNER);
        var valid=jwtDecoder.decode(session[0].getValue());
        assertThat(valid.getHeaders().get("alg")).isEqualTo("RS256");
        assertThat(valid.getExpiresAt().getEpochSecond()-valid.getIssuedAt().getEpochSecond()).isEqualTo(300);
        for (String invalid:List.of("issuer","audience","expiry")) {
            var claims=JwtClaimsSet.builder().claims(values -> values.putAll(valid.getClaims()));
            switch(invalid) {
                case "issuer" -> claims.issuer("urn:wrong:issuer");
                case "audience" -> claims.audience(List.of("different-api"));
                default -> claims.issuedAt(Instant.now().minusSeconds(600)).notBefore(Instant.now().minusSeconds(600)).expiresAt(Instant.now().minusSeconds(90));
            }
            var token=jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(),claims.build())).getTokenValue();
            mvc.perform(get("/api/auth/me").cookie(new Cookie(TokenCookies.ACCESS,token))).andExpect(status().isUnauthorized());
        }
        var parts=session[0].getValue().split("\\.");
        parts[2]=(parts[2].startsWith("a")?"b":"a")+parts[2].substring(1);
        mvc.perform(get("/api/auth/me").cookie(new Cookie(TokenCookies.ACCESS,String.join(".",parts)))).andExpect(status().isUnauthorized());
    }
}
