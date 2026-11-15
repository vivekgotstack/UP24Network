package com.up24.news.support;

import com.up24.news.identity.Accounts.Account;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

/** Role/CSRF fixtures; identity integration tests exercise actual signed cookies and OTP. */
public final class VerifiedLogin {
    private VerifiedLogin() {}
    public static RequestPostProcessor verified(Account account, JdbcTemplate jdbc, Instant now) {
        var id=UUID.randomUUID();
        jdbc.update("INSERT INTO identity_login_session(id,account_id,created_at,expires_at,verified_until,verified_role) VALUES (?,?,?,?,?,?)",
                id,account.id(),Timestamp.from(now),Timestamp.from(now.plusSeconds(3600)),Timestamp.from(now.plusSeconds(1800)),account.role().name());
        return jwt().jwt(token -> token.subject(account.id().toString()).claim("email",account.email()).claim("sid",id.toString()));
    }
}
