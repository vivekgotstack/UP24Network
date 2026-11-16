package com.up24.news.identity.internal;

import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UserDetailsPasswordService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.context.NullSecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.config.ObjectPostProcessor;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import com.up24.news.identity.Accounts;
import org.springframework.beans.factory.annotation.Value;
import java.util.Set;

@Configuration
@EnableMethodSecurity
class SecurityConfiguration {
    @Bean PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
    @Bean AuthenticationProvider authenticationProvider(UserDetailsService users,
            UserDetailsPasswordService passwords, PasswordEncoder encoder) {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        provider.setUserDetailsPasswordService(passwords);
        return provider;
    }
    @Bean SecurityFilterChain security(HttpSecurity http, LoginSessions sessions, TokenCookies cookies,
            Accounts accounts, PasswordLoginRateLimitFilter passwordLoginRateLimitFilter,
            @Value("${up24.auth.cookie-secure}") boolean secure) throws Exception {
        var csrf=new CookieCsrfTokenRepository();
        csrf.setHeaderName("X-CSRF-TOKEN");
        csrf.setCookieCustomizer(cookie -> cookie.httpOnly(true).secure(secure).sameSite("Strict").path("/"));
        var bearer=new DefaultBearerTokenResolver();
        var principal=new JwtAuthenticationConverter();
        principal.setPrincipalClaimName("email");
        var anonymousTokenPaths=Set.of("/api/auth/login","/api/auth/register","/api/auth/csrf","/api/auth/refresh","/api/auth/logout","/api/auth/password/request","/api/auth/password/reset");
        return http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .securityContext(context -> context.securityContextRepository(new NullSecurityContextRepository()))
                .requestCache(cache -> cache.disable())
                .addFilterBefore(passwordLoginRateLimitFilter,UsernamePasswordAuthenticationFilter.class)
                .csrf(config -> config.csrfTokenRepository(csrf).withObjectPostProcessor(new ObjectPostProcessor<CsrfFilter>() {
                    @Override public <O extends CsrfFilter> O postProcess(O filter) {
                        // Resource Server normally exempts bearer requests. Our browser bearer is
                        // carried by a cookie, so every unsafe request still requires CSRF proof.
                        filter.setRequireCsrfProtectionMatcher(CsrfFilter.DEFAULT_CSRF_MATCHER);
                        return filter;
                    }
                }))
                .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET,"/media/**","/api/publication/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST,"/api/auth/password/request","/api/auth/password/reset").permitAll()
                .requestMatchers("/api/articles/**","/api/horoscope/today","/actuator/health","/api/auth/csrf","/api/auth/register","/api/auth/login","/api/auth/refresh","/api/auth/logout").permitAll()
                .requestMatchers("/api/auth/me","/api/auth/workflow","/api/auth/logout-all","/api/auth/newsroom/**","/api/admin/**").authenticated().anyRequest().denyAll())
                .formLogin(form -> form.loginPage("/api/auth/login").loginProcessingUrl("/api/auth/login").usernameParameter("email")
                        .successHandler((request,response,authentication) -> {
                            var account=accounts.find(authentication.getName());
                            if(account.isEmpty()) { response.sendError(401,"Invalid email or password"); return; }
                            // A new password login supersedes this browser's previous refresh session.
                            sessions.logout(TokenCookies.read(request,TokenCookies.REFRESH));
                            if(!(authentication.getPrincipal() instanceof AccountUserDetails.Principal user)) {
                                response.sendError(401,"Invalid email or password"); return;
                            }
                            try { cookies.write(response,sessions.start(account.get(),user.version())); }
                            catch(LoginSessions.LoginUnavailable exception) { response.sendError(401,"Invalid email or password"); return; }
                            response.setContentType("application/json");
                            response.getWriter().write("{\"authenticated\":true}");
                        })
                        .failureHandler((request,response,exception) -> response.sendError(401,"Invalid email or password")))
                .logout(logout -> logout.disable())
                .oauth2ResourceServer(resource -> resource.bearerTokenResolver(request -> {
                    if (anonymousTokenPaths.contains(request.getRequestURI().substring(request.getContextPath().length()))) return null;
                    var header=bearer.resolve(request);
                    return header!=null ? header : TokenCookies.read(request,TokenCookies.ACCESS);
                }).jwt(jwt -> jwt.jwtAuthenticationConverter(principal)))
                .exceptionHandling(errors -> errors.authenticationEntryPoint((request,response,exception) -> response.sendError(401)))
                .build();
    }
}
