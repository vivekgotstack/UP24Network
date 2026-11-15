package com.up24.news.identity.internal;

import com.up24.news.identity.Access;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
class TokenController {
    private final LoginSessions sessions;
    private final TokenCookies cookies;
    private final JwtDecoder decoder;
    private final Access access;
    TokenController(LoginSessions sessions, TokenCookies cookies, JwtDecoder decoder, Access access) {
        this.sessions=sessions; this.cookies=cookies; this.decoder=decoder; this.access=access;
    }
    @PostMapping("/refresh") @ResponseStatus(HttpStatus.NO_CONTENT)
    void refresh(HttpServletRequest request, HttpServletResponse response) {
        var tokens=sessions.refresh(TokenCookies.read(request,TokenCookies.REFRESH));
        if (tokens.isEmpty()) {
            cookies.clear(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Your login has ended. Sign in again.");
        }
        cookies.write(response,tokens.get());
    }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request, HttpServletResponse response) {
        sessions.logout(TokenCookies.read(request,TokenCookies.REFRESH));
        var token=TokenCookies.read(request,TokenCookies.ACCESS);
        if (token!=null) try { sessions.revoke(UUID.fromString(decoder.decode(token).getClaimAsString("sid"))); }
        catch (JwtException | IllegalArgumentException ignored) { }
        cookies.clear(response);
    }
    @PostMapping("/logout-all") @ResponseStatus(HttpStatus.NO_CONTENT)
    void logoutAll(HttpServletResponse response) {
        sessions.revokeAll(access.current().id());
        cookies.clear(response);
    }
}
