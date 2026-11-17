package com.up24.news.media.internal;

import com.up24.news.media.MediaMigration;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/media/storage/migration")
@PreAuthorize("@access.hasAny('ADMIN')")
class MediaMigrationController {
    private final MediaMigration migration;
    MediaMigrationController(MediaMigration migration) { this.migration=migration; }
    @GetMapping MediaMigration.Status status() { return migration.status(); }
    @PostMapping MediaMigration.Status start() { return migration.start(); }
}
