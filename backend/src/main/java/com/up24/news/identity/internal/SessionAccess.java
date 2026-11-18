package com.up24.news.identity.internal;

import com.up24.news.identity.Access;
import com.up24.news.identity.Accounts;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

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
        var account = authentication instanceof JwtAuthenticationToken jwt
                ? accounts.find(UUID.fromString(jwt.getToken().getSubject())) : accounts.find(authentication.getName());
        return account.filter(Accounts.Account::enabled)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    @Override public boolean hasAny(String... roles) {
        try {
            var account=current();
            return newsroom.verified(account) && Arrays.asList(roles).contains(account.role().name());
        }
        catch (ResponseStatusException exception) { return false; }
    }

    @Override public boolean isReaderVisit() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && !(authentication instanceof AnonymousAuthenticationToken)) {
            try { return current().role() == Accounts.Role.SUBSCRIBER; }
            catch (ResponseStatusException exception) { return false; }
        }
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) return false;
        var request = attributes.getRequest();
        // A refresh-only session can still belong to a newsroom account. Let the
        // next authenticated request identify its role before counting it.
        return request.getHeader(HttpHeaders.AUTHORIZATION) == null
                && TokenCookies.read(request, TokenCookies.ACCESS) == null
                && TokenCookies.read(request, TokenCookies.REFRESH) == null;
    }
}
