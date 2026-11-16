package com.up24.news.jobs.internal;

import com.up24.news.jobs.BackgroundJobs;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

interface JobStore {
    record Dispatch(UUID id,BackgroundJobs.Lane lane,Instant expiresAt,UUID lease) {}
    record Work(UUID id,String type,byte[] payload,UUID lease) {
        @Override public String toString() { return "Work[redacted]"; }
    }
    UUID insert(UUID id,String type,BackgroundJobs.Lane lane,String dedup,byte[] payload,Instant expires);
    Optional<BackgroundJobs.Status> status(UUID id);
    List<Dispatch> dispatch();
    void published(Dispatch dispatch);
    void publicationFailed(Dispatch dispatch);
    Optional<Work> start(UUID id);
    void finish(Work work);
    void fail(Work work,boolean permanent);
    void heartbeat(UUID id,UUID lease);
    void maintain();
    Map<String,Long> counts();
}
