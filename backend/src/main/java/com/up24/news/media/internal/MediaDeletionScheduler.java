package com.up24.news.media.internal;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class MediaDeletionScheduler {
    private final MediaStore media;
    private final UnusedMediaCleanup cleanup;
    MediaDeletionScheduler(MediaStore media,UnusedMediaCleanup cleanup) { this.media=media;this.cleanup=cleanup; }
    @Scheduled(fixedDelayString="${up24.media.cleanup.interval-ms:60000}",initialDelayString="${up24.media.cleanup.interval-ms:60000}")
    public void retry() { media.dueDeletions().stream().map(MediaStore.Deletion::id).distinct().forEach(cleanup::removeIfUnreferenced); }
}
