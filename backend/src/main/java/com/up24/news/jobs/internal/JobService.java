package com.up24.news.jobs.internal;

import com.up24.news.jobs.BackgroundJobs;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
class JobService implements BackgroundJobs {
    private final JobStore store;
    private final JobPayloadCodec codec;
    private final Clock clock;
    JobService(JobStore store,JobPayloadCodec codec,Clock clock) { this.store=store;this.codec=codec;this.clock=clock; }
    @Override public UUID submit(String type,Lane lane,String dedup,Object payload,Instant expiresAt) {
        if(type==null || !type.matches("[a-z][a-z0-9.-]{2,79}") || lane==null || dedup==null || dedup.isBlank() || dedup.length()>180
                || expiresAt==null || !expiresAt.isAfter(clock.instant()) || expiresAt.isAfter(clock.instant().plusSeconds(604800)))
            throw new IllegalArgumentException("Provide a valid, bounded background job.");
        var id=UUID.randomUUID();return store.insert(id,type,lane,dedup,codec.encode(id,payload),expiresAt);
    }
    @Override public Status status(UUID id) { return store.status(id).orElseThrow(()->new IllegalArgumentException("Job not found.")); }
}
