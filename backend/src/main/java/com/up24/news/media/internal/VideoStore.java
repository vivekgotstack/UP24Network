package com.up24.news.media.internal;

import com.up24.news.media.MediaVideos;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface VideoStore {
    record Stored(MediaVideos.Video view,UUID owner,StorageLocation source,StorageLocation output,UUID jobId,UUID processingToken,Instant expiresAt,Instant uploadLeaseUntil) {}
    Optional<Stored> find(UUID id);
    Optional<Stored> lock(UUID id);
    void quotaLock();
    long reservedBytes();
    long pendingFor(UUID owner);
    void insert(UUID id,String name,long bytes,long reserved,UUID owner,StorageLocation source,Instant expiresAt);
    MediaVideos.Page list(UUID actor,boolean privileged,int page,int size);
    void queued(UUID id,UUID jobId);
    boolean acquireUpload(UUID id,UUID token);
    void releaseUpload(UUID id,UUID token);
    boolean processing(UUID id,UUID token);
    boolean ready(UUID id,UUID token,StorageLocation output,long bytes,String checksum,VideoProcessor.Probe probe);
    void failed(UUID id,UUID token,boolean terminal);
    void deleting(UUID id,UUID jobId);
    void deletionFailed(UUID id);
    void delete(UUID id);
    List<UUID> abandoned();
    List<Stored> unfinished();
    void terminal(UUID id,UUID jobId);
}
