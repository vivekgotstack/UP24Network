package com.up24.news.jobs;

import java.time.Instant;
import java.util.UUID;

/** Durable work contract: transport and persistence are private implementation details. */
public interface BackgroundJobs {
    enum Lane { MAIL, MEDIA }
    record Status(UUID id,String type,String state,int attempts,String error) {}
    UUID submit(String type,Lane lane,String deduplicationKey,Object payload,Instant expiresAt);
    Status status(UUID id);
}
