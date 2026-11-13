package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Component
class NewsroomPolicy {
    static final String VERIFIED_EMAIL = "up24.newsroom.verified-email";
    static final String VERIFIED_UNTIL = "up24.newsroom.verified-until";
    private final String ownerEmail;
    private final Clock clock;
    NewsroomPolicy(@Value("${up24.newsroom.owner-email}") String ownerEmail, Clock clock) {
        this.ownerEmail=ownerEmail.trim().toLowerCase(Locale.ROOT); this.clock=clock;
    }
    String ownerEmail() { return ownerEmail; }
    boolean eligible(Accounts.Account account) {
        return (account.role()==Accounts.Role.ADMIN && ownerEmail.equals(account.email()))
                || account.role()==Accounts.Role.EDITOR || account.role()==Accounts.Role.REPORTER;
    }
    boolean verified(Accounts.Account account) {
        var attributes=RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof ServletRequestAttributes servlet)) return false;
        return verified(account,servlet.getRequest().getSession(false));
    }
    private boolean verified(Accounts.Account account,HttpSession session) {
        return eligible(account) && session!=null && account.email().equals(session.getAttribute(VERIFIED_EMAIL))
                && session.getAttribute(VERIFIED_UNTIL) instanceof Instant until && clock.instant().isBefore(until);
    }
    void markVerified(HttpServletRequest request,Accounts.Account account) {
        request.changeSessionId();
        var session=request.getSession();
        session.setAttribute(VERIFIED_EMAIL,account.email());
        session.setAttribute(VERIFIED_UNTIL,clock.instant().plus(Duration.ofMinutes(30)));
    }
    void clear(HttpSession session) {
        session.removeAttribute(VERIFIED_EMAIL); session.removeAttribute(VERIFIED_UNTIL);
    }
}
