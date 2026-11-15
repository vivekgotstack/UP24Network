package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts.Account;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
class JwtAccessTokenIssuer implements AccessTokenIssuer {
    private final JwtEncoder encoder;
    private final JwtSigningConfiguration.SigningKey key;
    private final String issuer;
    private final String audience;
    JwtAccessTokenIssuer(JwtEncoder encoder, JwtSigningConfiguration.SigningKey key,
            @Value("${up24.auth.issuer}") String issuer, @Value("${up24.auth.audience}") String audience) {
        this.encoder=encoder; this.key=key; this.issuer=issuer; this.audience=audience;
    }
    @Override public String issue(Account account, UUID sessionId, Instant now, Instant expiresAt) {
        var claims = JwtClaimsSet.builder().issuer(issuer).audience(List.of(audience))
                .subject(account.id().toString()).issuedAt(now).notBefore(now).expiresAt(expiresAt)
                .id(UUID.randomUUID().toString()).claim("sid",sessionId.toString())
                .claim("email",account.email()).claim("token_use","access").build();
        var header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(key.id()).type("JWT").build();
        return encoder.encode(JwtEncoderParameters.from(header,claims)).getTokenValue();
    }
}
