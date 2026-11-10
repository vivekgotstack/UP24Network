package com.up24.news.identity.internal;

import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
class SecurityConfiguration {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                .requestMatchers("/api/articles/**","/actuator/health","/api/auth/csrf","/api/auth/register","/api/auth/login").permitAll()
                .requestMatchers("/api/auth/me","/api/admin/**").authenticated().anyRequest().denyAll())
                .formLogin(form -> form.loginProcessingUrl("/api/auth/login").usernameParameter("email")
                        .successHandler((request,response,authentication) -> { response.setContentType("application/json"); response.getWriter().write("{\"authenticated\":true}"); })
                        .failureHandler((request,response,exception) -> response.sendError(401,"Invalid email or password")))
                .logout(logout -> logout.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((request,response,authentication) -> response.setStatus(204)))
                .exceptionHandling(errors -> errors.authenticationEntryPoint((request,response,exception) -> response.sendError(401)))
                .build();
    }
}
