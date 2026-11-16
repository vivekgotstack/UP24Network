package com.up24.news.media.internal;

import com.up24.news.media.MediaLibrary;
import com.up24.news.media.MediaRetention;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/media")
@PreAuthorize("@access.hasAny('ADMIN')")
class MediaRetentionController {
    private final MediaRetention retention;
    MediaRetentionController(MediaRetention retention) { this.retention=retention; }
    @GetMapping("/storage") MediaRetention.Status status() { return retention.status(); }
    @PutMapping("/storage") MediaRetention.Status save(@Valid @RequestBody MediaRetention.Input input) { return retention.save(input); }
    @PostMapping("/storage/sync") MediaRetention.Status sync() { return retention.synchronize(); }
    @PatchMapping("/{id:[a-f0-9]{64}}/retention") MediaLibrary.Asset eligibility(@PathVariable String id,@Valid @RequestBody MediaRetention.Eligibility input) {
        return retention.eligibility(id,input);
    }
}
