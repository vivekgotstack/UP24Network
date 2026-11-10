package com.up24.news.automation.internal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/automations")
@PreAuthorize("@access.hasAny('ADMIN')")
class AutomationController {
    record Settings(boolean enabled,@Min(5) @Max(10080) int intervalMinutes) {}
    private final AutomationService service;
    AutomationController(AutomationService service) { this.service=service; }
    @GetMapping List<AutomationService.Job> list() { return service.list(); }
    @PatchMapping("/{key}") AutomationService.Job update(@PathVariable String key,@Valid @RequestBody Settings input) { return service.update(key,input.enabled(),input.intervalMinutes()); }
    @PostMapping("/{key}/run") AutomationService.Job run(@PathVariable String key) { return service.run(key); }
}
