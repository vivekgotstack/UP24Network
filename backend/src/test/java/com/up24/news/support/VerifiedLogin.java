package com.up24.news.support;

import com.up24.news.identity.Accounts.Account;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

/** Role/CSRF fixtures; identity integration tests exercise actual signed cookies and OTP. */
public final class VerifiedLogin {
    private VerifiedLogin() {}
    public static RequestPostProcessor verified(Account account, JdbcTemplate jdbc, Instant now) {
        var id=UUID.randomUUID();
        boolean staff=!account.role().name().equals("SUBSCRIBER");
        jdbc.update("INSERT INTO identity_login_session(id,account_id,created_at,expires_at,verified_until,verified_role) VALUES (?,?,?,?,?,?)",
                id,account.id(),Timestamp.from(now),Timestamp.from(now.plusSeconds(3600)),staff?Timestamp.from(now.plusSeconds(1800)):null,staff?account.role().name():null);
        var jwt=Jwt.withTokenValue("role-fixture").header("alg","RS256").subject(account.id().toString())
                .claim("email",account.email()).claim("sid",id.toString()).issuedAt(now).expiresAt(now.plusSeconds(300)).build();
        // jwt() deliberately skips CSRF in Spring's test support; these tests must exercise CSRF.
        return authentication(new JwtAuthenticationToken(jwt,List.of()));
    }
}
