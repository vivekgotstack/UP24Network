package com.up24.news.identity.internal;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class PasswordLoginThrottleConfiguration {
    @Bean PasswordLoginRateLimitFilter passwordLoginRateLimitFilter(LoginAttemptLimiter limiter) { return new PasswordLoginRateLimitFilter(limiter); }
    @Bean FilterRegistrationBean<PasswordLoginRateLimitFilter> passwordLoginRateLimitRegistration(PasswordLoginRateLimitFilter filter) {
        var registration=new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
