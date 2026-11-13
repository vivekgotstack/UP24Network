package com.up24.news.identity.internal;

import com.up24.news.notification.LoginCodeDelivery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
class EmailOtpService {
    record Issued(Instant expiresAt,Instant resendAt) {}
    private final LoginChallengeStore challenges;
    private final LoginCodeDelivery delivery;
    private final Clock clock;
    private final byte[] secret;
    private final SecureRandom random=new SecureRandom();
    EmailOtpService(LoginChallengeStore challenges,LoginCodeDelivery delivery,Clock clock,
                    @Value("${up24.newsroom.otp-secret:}") String secret) {
        this.challenges=challenges; this.delivery=delivery; this.clock=clock;
        this.secret=secret.matches("[A-Fa-f0-9]{64}")?HexFormat.of().parseHex(secret):new byte[0];
    }
    private String digest(String text) {
        try {
            var mac=Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret,"HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(text.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) { throw new IllegalStateException("Could not protect the login challenge"); }
    }
    Issued issue(String email,String sessionId) {
        if (secret.length!=32 || !delivery.configured())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Email sign-in is not configured. Contact the administrator.");
        var id=UUID.randomUUID();
        String code=String.format(Locale.ROOT,"%06d",random.nextInt(1_000_000));
        var now=clock.instant();
        var expires=now.plusSeconds(300);
        challenges.reserve(email,id,digest(sessionId),digest(id+":"+code),now,expires);
        try { delivery.send(email,code,expires); }
        catch (RuntimeException exception) {
            challenges.invalidate(email,id);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"The sign-in email could not be sent. Please try again shortly.");
        }
        return new Issued(expires,now.plusSeconds(60));
    }
    boolean verify(String email,String sessionId,String code) {
        return secret.length==32 && challenges.consume(email,digest(sessionId),id->digest(id+":"+code),clock.instant());
    }
}
