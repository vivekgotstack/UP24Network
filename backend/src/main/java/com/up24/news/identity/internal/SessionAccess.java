package com.up24.news.identity.internal;

import com.up24.news.identity.Access;
import com.up24.news.identity.Accounts;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.util.Arrays;

/** Read database roles so revocation applies to already signed-in users. */
@Component("access")
class SessionAccess implements Access {
    private final Accounts accounts;
    private final NewsroomPolicy newsroom;
    SessionAccess(Accounts accounts,NewsroomPolicy newsroom) { this.accounts = accounts; this.newsroom=newsroom; }

    @Override public Accounts.Account current() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return accounts.find(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    @Override public boolean hasAny(String... roles) {
        try {
            var account=current();
            return newsroom.verified(account) && Arrays.asList(roles).contains(account.role().name());
        }
        catch (ResponseStatusException exception) { return false; }
    }
}
