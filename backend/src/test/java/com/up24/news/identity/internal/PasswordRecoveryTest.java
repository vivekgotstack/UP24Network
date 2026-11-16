package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import com.up24.news.notification.PasswordRecoveryDelivery;
import com.up24.news.notification.LoginCodeDelivery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email=","up24.newsroom.admin-email=recovery-owner@identity.test"})
@AutoConfigureMockMvc
@Transactional
class PasswordRecoveryTest {
    @Autowired Accounts accounts;
    @Autowired PasswordRecoveryService recovery;
    @Autowired LoginSessions sessions;
    @Autowired CredentialRepository credentials;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;
    @MockitoBean(extraInterfaces=LoginCodeDelivery.class) PasswordRecoveryDelivery delivery;
    @MockitoBean(name="passwordRecoveryExecutor") ThreadPoolTaskExecutor executor;
    private String code;
    @BeforeEach void captureMail() {
        when(delivery.configured()).thenReturn(true);
        doAnswer(call -> { ((Runnable)call.getArgument(0)).run(); return null; }).when(executor).execute(any(Runnable.class));
        doAnswer(call -> { code=call.getArgument(1); return null; }).when(delivery).sendRecovery(anyString(),anyString(),any(Instant.class));
    }
    @Test void recoveryIsSingleUseRevokesSessionsAndRejectsAnAuthenticationRacingTheReset() throws Exception {
        var account=accounts.create("recover-"+UUID.randomUUID()+"@identity.test","Reader","Previous-password-2026!",Accounts.Role.SUBSCRIBER);
        var login=sessions.start(account);
        String payload="{\"email\":\""+account.email()+"\"}";
        mvc.perform(post("/api/auth/password/request").contentType("application/json").content(payload)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/password/request").with(csrf()).contentType("application/json").content(payload))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.code").doesNotExist());
        assertThat(code).matches("[0-9]{6}");
        assertThat(jdbc.queryForObject("SELECT code_digest FROM identity_password_recovery WHERE account_id=?",String.class,account.id())).hasSize(64).isNotEqualTo(code);
        assertThat(recovery.complete(account.email(),code,"Replacement-password-2026!")).isTrue();
        assertThat(recovery.complete(account.email(),code,"Another-password-2026!")).isFalse();
        assertThat(sessions.active(login.sessionId())).isEmpty();
        assertThat(sessions.refresh(login.refresh())).isEmpty();
        assertThatThrownBy(() -> sessions.start(account,account.version())).isInstanceOf(LoginSessions.LoginUnavailable.class);
        assertThat(passwords.matches("Replacement-password-2026!",credentials.findCredential(account.email()).orElseThrow().encodedPassword())).isTrue();
    }
    @Test void attemptsExpireAndReservedDisabledAndUnknownAccountsReceiveNoCode() throws Exception {
        var reader=accounts.create("limited-"+UUID.randomUUID()+"@identity.test","Reader","Original-password-2026!",Accounts.Role.SUBSCRIBER);
        recovery.request(reader.email(),"192.0.2.10");
        String valid=code,wrong=code.equals("000000")?"000001":"000000";
        for(int index=0;index<5;index++) assertThat(recovery.complete(reader.email(),wrong,"Replacement-password-2026!")).isFalse();
        assertThat(recovery.complete(reader.email(),valid,"Replacement-password-2026!")).isFalse();
        jdbc.update("UPDATE identity_password_recovery SET attempts=0,issued_at=CURRENT_TIMESTAMP-INTERVAL '11 minutes',expires_at=CURRENT_TIMESTAMP-INTERVAL '1 minute' WHERE account_id=?",reader.id());
        assertThat(recovery.complete(reader.email(),valid,"Replacement-password-2026!")).isFalse();
        var owner=accounts.create("recovery-owner@identity.test","Owner","Owner-password-2026!",Accounts.Role.ADMIN);
        jdbc.update("UPDATE identity_account SET enabled=false WHERE id=?",reader.id());
        clearInvocations(delivery);
        recovery.request(reader.email(),"192.0.2.11");
        recovery.request(owner.email(),"192.0.2.11");
        mvc.perform(post("/api/auth/password/request").with(csrf()).contentType("application/json").content("{\"email\":\"unknown@identity.test\"}"))
                .andExpect(status().isAccepted());
        verify(delivery,never()).sendRecovery(anyString(),anyString(),any(Instant.class));
    }
}
