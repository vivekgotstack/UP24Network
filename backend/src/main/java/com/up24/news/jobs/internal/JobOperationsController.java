package com.up24.news.jobs.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/operations/jobs")
@PreAuthorize("@access.hasAny('ADMIN')")
class JobOperationsController {
    private final JobStore store;
    private final String transport;
    JobOperationsController(JobStore store,@Value("${up24.jobs.transport:local}") String transport) { this.store=store;this.transport=transport; }
    @GetMapping Map<String,Object> status() { return Map.of("transport",transport,"counts",store.counts()); }
}
