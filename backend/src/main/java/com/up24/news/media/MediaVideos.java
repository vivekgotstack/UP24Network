package com.up24.news.media;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Video catalogue and upload contract; raw bytes never pass through article storage. */
public interface MediaVideos {
    record Video(UUID id,String name,String state,long originalBytes,long storedBytes,int width,int height,double durationSeconds,
                 String url,String error,long version,Instant createdAt) {}
    record Ticket(Video video,boolean direct,String uploadUrl,Map<String,String> headers,Instant expiresAt) {}
    record Page(List<Video> items,long total,int page,int size,int pages,long reservedBytes,long quotaBytes,boolean processingAvailable,long maxUploadBytes) {}
    Ticket ticket(String name,long bytes,UUID actor);
    Video complete(UUID id,UUID actor,boolean privileged);
    Video retry(UUID id,long version,UUID actor,boolean privileged);
    Video get(UUID id,UUID actor,boolean privileged);
    Page list(UUID actor,boolean privileged,int page,int size);
    void remove(UUID id);
}
