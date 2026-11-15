package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.Clock;

@Component
class NewsroomPolicy {
    private final String adminEmail;
    private final Clock clock;
    private final LoginSessions sessions;
    private final CurrentLogin login;
    NewsroomPolicy(@Value("${up24.newsroom.admin-email}") String adminEmail, Clock clock, LoginSessions sessions, CurrentLogin login) {
        this.adminEmail=EmailAddresses.normalize(adminEmail); this.clock=clock; this.sessions=sessions; this.login=login;
    }
    String adminEmail() { return adminEmail; }
    boolean eligible(Accounts.Account account) {
        return (account.role()==Accounts.Role.ADMIN && adminEmail.equals(account.email()))
                || account.role()==Accounts.Role.EDITOR || account.role()==Accounts.Role.REPORTER;
    }
    boolean verified(Accounts.Account account) {
        return eligible(account) && sessions.active(login.id()).filter(session -> session.accountId().equals(account.id())
                && account.role().name().equals(session.verifiedRole()) && session.verifiedUntil()!=null
                && clock.instant().isBefore(session.verifiedUntil())).isPresent();
    }
    void markVerified(Accounts.Account account) {
        sessions.verify(login.id(),account);
    }
    void clear() { sessions.clearVerification(login.id()); }
}
