package com.up24.news.media.internal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

interface MigrationStore {
    record Run(UUID id,UUID jobId,Instant startedAt,Instant completedAt,long moved,String error,String bucket,String prefix) {}
    record Copy(String assetId,UUID token,StorageLocation destination,int bytes,Instant expiresAt) {}
    Run read();
    Run lock();
    void begin(UUID runId,UUID jobId,String bucket,String prefix);
    void advance(UUID runId,UUID currentJobId,UUID nextJobId);
    void moved(UUID runId);
    void complete(UUID runId,UUID currentJobId);
    void error(UUID runId,UUID jobId,String message);
    boolean reserve(Copy copy);
    boolean owns(Copy copy);
    boolean release(Copy copy);
    List<Copy> expired();
}
