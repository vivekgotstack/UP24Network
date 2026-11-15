package com.up24.news.identity.internal;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DataAccessException;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Endpoint rate protection; credential verification stays in Spring Security. */
class PasswordLoginRateLimitFilter extends OncePerRequestFilter {
    private final LoginAttemptLimiter limiter;
    PasswordLoginRateLimitFilter(LoginAttemptLimiter limiter) { this.limiter=limiter; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod())
                || !"/api/auth/login".equals(request.getRequestURI().substring(request.getContextPath().length()));
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            var decision=limiter.check(request.getParameter("email"),request.getRemoteAddr());
            if (!decision.allowed()) {
                reject(response,429,decision.retryAfterSeconds(),"Too many sign-in attempts","Please wait before signing in again.");
                return;
            }
        } catch (DataAccessException exception) {
            // Fail closed while persistent login protection is unavailable.
            reject(response,503,30,"Sign-in temporarily unavailable","Please try again shortly.");
            return;
        }
        chain.doFilter(request,response);
    }
    private void reject(HttpServletResponse response, int status, long retryAfter, String title, String detail) throws IOException {
        response.setStatus(status);
        response.setHeader("Retry-After",Long.toString(retryAfter));
        response.setHeader("Cache-Control","no-store");
        response.setContentType("application/problem+json");
        response.getWriter().write("{\"type\":\"urn:up24:sign-in-protection\",\"status\":"+status+",\"title\":\""+title+"\",\"detail\":\""+detail+"\"}");
    }
}
