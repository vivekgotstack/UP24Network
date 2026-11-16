package com.up24.news.platform;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Security and storage maintenance remain active when editorial imports are off. */
@Configuration
@EnableScheduling
class BackgroundSchedulingConfiguration {
    @Bean ThreadPoolTaskScheduler taskScheduler() {
        var scheduler=new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(3);scheduler.setThreadNamePrefix("up24-scheduled-");
        scheduler.setRemoveOnCancelPolicy(true);scheduler.setAwaitTerminationSeconds(20);
        return scheduler;
    }
}
