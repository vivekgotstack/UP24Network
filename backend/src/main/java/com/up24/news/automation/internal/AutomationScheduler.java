package com.up24.news.automation.internal;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name="up24.automation.scheduling-enabled",havingValue="true",matchIfMissing=true)
class AutomationScheduler {
    private final AutomationService service;
    AutomationScheduler(AutomationService service) { this.service=service; }
    @Scheduled(fixedDelay=60000,initialDelay=10000) void refresh() { service.runDue(); }
}
