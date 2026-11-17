package com.up24.news.media;

import java.time.Instant;
import java.util.UUID;

/** Administrator-controlled relocation; public image identifiers never change. */
public interface MediaMigration {
    record Status(boolean configured,String state,UUID jobId,long moved,long remaining,
                  Instant startedAt,Instant completedAt,String error) {}
    Status status();
    Status start();
}
