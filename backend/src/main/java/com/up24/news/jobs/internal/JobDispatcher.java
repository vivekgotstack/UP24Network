package com.up24.news.jobs.internal;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class JobDispatcher {
    private final JobStore store;
    private final JobPublisher publisher;
    JobDispatcher(JobStore store,JobPublisher publisher) { this.store=store;this.publisher=publisher; }
    @Scheduled(fixedDelayString="${up24.jobs.dispatch-ms:1000}",initialDelay=2000)
    public void dispatch() {
        for(var job:store.dispatch()) {
            try { publisher.publish(job);store.published(job); }
            catch(Exception exception) { store.publicationFailed(job); }
        }
    }
    @Scheduled(fixedDelay=60000,initialDelay=60000)
    public void maintenance() { store.maintain(); }
}
