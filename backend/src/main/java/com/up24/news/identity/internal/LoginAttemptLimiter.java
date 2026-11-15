package com.up24.news.identity.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

@Service
class LoginAttemptLimiter {
    record Decision(boolean allowed, long retryAfterSeconds) {}
    private final LoginAttemptBuckets buckets;
    private final Clock clock;
    private final SecretKeySpec key;
    private final int pairLimit;
    private final int addressLimit;
    private final Duration window;

    LoginAttemptLimiter(LoginAttemptBuckets buckets, Clock clock,
            @Value("${up24.auth.login-throttle.secret:${up24.newsroom.otp-secret:}}") String pepper,
            @Value("${up24.auth.login-throttle.pair-limit:10}") int pairLimit,
            @Value("${up24.auth.login-throttle.ip-limit:60}") int addressLimit,
            @Value("${up24.auth.login-throttle.window:PT5M}") Duration window) {
        if (!pepper.matches("[a-fA-F0-9]{64}")) throw new IllegalStateException("Configure the server-side login protection secret before starting authentication.");
        if (pairLimit<1 || addressLimit<pairLimit || addressLimit>10000 || window.compareTo(Duration.ofSeconds(30))<0
                || window.compareTo(Duration.ofHours(1))>0) throw new IllegalArgumentException("Invalid password sign-in throttle settings.");
        this.buckets=buckets; this.clock=clock; this.pairLimit=pairLimit; this.addressLimit=addressLimit; this.window=window;
        this.key=new SecretKeySpec(hmac(new SecretKeySpec(HexFormat.of().parseHex(pepper),"HmacSHA256"),"UP24/password-login-limit/v1"),"HmacSHA256");
    }
    private static byte[] hmac(SecretKeySpec key, String message) {
        try {
            var mac=Mac.getInstance("HmacSHA256"); mac.init(key);
            return mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException exception) { throw new IllegalStateException("The login protection key could not be used.",exception); }
    }
    private String digest(String scope, String email, String address) {
        return HexFormat.of().formatHex(hmac(key,scope+'\0'+email+'\0'+address));
    }
    private Decision attempt(String key, int limit, Instant now) {
        var result=buckets.recordAttempt(key,now,now.plus(window),limit);
        if (result.isEmpty()) return new Decision(false,60);
        if (result.get().attempts()<=limit) return new Decision(true,0);
        long millis=Duration.between(now,result.get().expiresAt()).toMillis();
        return new Decision(false,Math.max(1,(millis+999)/1000));
    }
    Decision check(String submittedEmail, String remoteAddress) {
        var now=clock.instant();
        String email=submittedEmail==null || submittedEmail.length()>254 ? "invalid" : EmailAddresses.normalize(submittedEmail);
        String address=remoteAddress==null || remoteAddress.length()>128 ? "unknown" : remoteAddress;
        // Stop before allocating new email buckets once an address is already limited.
        var byAddress=attempt(digest("address","",address),addressLimit,now);
        return byAddress.allowed() ? attempt(digest("pair",email,address),pairLimit,now) : byAddress;
    }
    @Scheduled(fixedDelayString="${up24.auth.login-throttle.cleanup-ms:60000}",initialDelayString="${up24.auth.login-throttle.cleanup-ms:60000}")
    public void cleanExpired() { buckets.removeExpired(clock.instant()); }
}
