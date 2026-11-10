package com.up24.news.identity;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.util.Arrays;

/** Consult the database so role revocation takes effect on existing sessions. */
@Component("access")
public class Access {
    private final Accounts accounts;
    public Access(Accounts accounts) { this.accounts = accounts; }
    public Accounts.Account current() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return accounts.find(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
    public boolean hasAny(String... roles) {
        try { return Arrays.asList(roles).contains(current().role().name()); }
        catch (ResponseStatusException exception) { return false; }
    }
}
