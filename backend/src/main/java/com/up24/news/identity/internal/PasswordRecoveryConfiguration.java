package com.up24.news.identity.internal;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
class PasswordRecoveryConfiguration {
    @Bean(name="passwordRecoveryExecutor")
    ThreadPoolTaskExecutor passwordRecoveryExecutor() {
        var executor=new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1); executor.setMaxPoolSize(2); executor.setQueueCapacity(32);
        executor.setThreadNamePrefix("password-recovery-");
        executor.setWaitForTasksToCompleteOnShutdown(true); executor.setAwaitTerminationSeconds(15);
        return executor;
    }
}
