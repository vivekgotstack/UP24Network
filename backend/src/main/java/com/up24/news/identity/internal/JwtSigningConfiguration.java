package com.up24.news.identity.internal;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;

@Configuration
class JwtSigningConfiguration {
    record SigningKey(RSAPublicKey publicKey, RSAPrivateKey privateKey, String id) {
        @Override public String toString() { return "SigningKey[redacted]"; }
    }
    @Bean SigningKey signingKey(@Value("${up24.auth.key-store}") Resource resource,
                               @Value("${up24.auth.key-store-password}") String password) throws Exception {
        if (password.isBlank()) throw new IllegalStateException("Configure the authentication signing key before starting the backend.");
        var store=KeyStore.getInstance("PKCS12");
        try(var input=resource.getInputStream()) { store.load(input,password.toCharArray()); }
        var publicKey=(RSAPublicKey)store.getCertificate("up24").getPublicKey();
        var privateKey=(RSAPrivateKey)store.getKey("up24",password.toCharArray());
        var id=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(publicKey.getEncoded())).substring(0,24);
        return new SigningKey(publicKey,privateKey,id);
    }
    @Bean JwtEncoder jwtEncoder(SigningKey key) {
        var rsa=new RSAKey.Builder(key.publicKey()).privateKey(key.privateKey()).keyID(key.id()).build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsa)));
    }
    @Bean JwtDecoder jwtDecoder(SigningKey key, LoginSessionStore sessions, Clock clock,
            @Value("${up24.auth.issuer}") String issuer, @Value("${up24.auth.audience}") String audience) {
        var decoder=NimbusJwtDecoder.withPublicKey(key.publicKey()).build();
        var timestamp=new JwtTimestampValidator(Duration.ofSeconds(30));
        timestamp.setClock(clock);
        OAuth2TokenValidator<Jwt> login = jwt -> {
            try {
                var id=UUID.fromString(jwt.getClaimAsString("sid"));
                var subject=UUID.fromString(jwt.getSubject());
                if ("access".equals(jwt.getClaimAsString("token_use")) && jwt.getAudience().contains(audience)
                        && jwt.getExpiresAt()!=null && jwt.getIssuedAt()!=null
                        && sessions.active(id,clock.instant()).filter(session -> session.accountId().equals(subject)).isPresent())
                    return OAuth2TokenValidatorResult.success();
            } catch (IllegalArgumentException | NullPointerException ignored) { }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token","The login is no longer valid.",null));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(timestamp,new JwtIssuerValidator(issuer),login));
        return decoder;
    }
}
