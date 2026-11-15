package com.up24.news.identity.internal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.time.Duration;

@Component
class TokenCookies {
    static final String ACCESS="UP24_ACCESS";
    static final String REFRESH="UP24_REFRESH";
    private final boolean secure;
    private final Clock clock;
    TokenCookies(@Value("${up24.auth.cookie-secure}") boolean secure, Clock clock) { this.secure=secure; this.clock=clock; }
    static String read(HttpServletRequest request, String name) {
        if (request.getCookies()!=null) for (var cookie:request.getCookies()) if (name.equals(cookie.getName())) return cookie.getValue();
        return null;
    }
    private void set(HttpServletResponse response, String name, String value, Duration age) {
        response.addHeader(HttpHeaders.SET_COOKIE,ResponseCookie.from(name,value).httpOnly(true).secure(secure)
                .sameSite("Strict").path("/").maxAge(age).build().toString());
    }
    void write(HttpServletResponse response, LoginSessions.Tokens tokens) {
        // Keep the expired access cookie long enough for SSR to route through renewal.
        var remaining=Duration.between(clock.instant(),tokens.sessionExpiresAt());
        set(response,ACCESS,tokens.access(),remaining);
        set(response,REFRESH,tokens.refresh(),remaining);
        response.setHeader(HttpHeaders.CACHE_CONTROL,"private, no-store");
    }
    void clear(HttpServletResponse response) {
        set(response,ACCESS,"",Duration.ZERO); set(response,REFRESH,"",Duration.ZERO);
        response.setHeader(HttpHeaders.CACHE_CONTROL,"private, no-store");
    }
}
