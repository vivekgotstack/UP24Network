package com.up24.news.identity.internal;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

/** Spring Security boundary; the application works with login IDs, not servlet sessions. */
@Component
class CurrentLogin {
    UUID id() {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwt && jwt.isAuthenticated()) {
            try { return UUID.fromString(jwt.getToken().getClaimAsString("sid")); }
            catch (IllegalArgumentException | NullPointerException ignored) { }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    }
}
