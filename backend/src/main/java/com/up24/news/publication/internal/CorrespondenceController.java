package com.up24.news.publication.internal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
class CorrespondenceController {
    record Resolution(@NotNull @Min(0) Integer version, @NotNull Boolean resolved) {}
    record Removal(@NotNull @Min(0) Integer version) {}

    private final CorrespondenceInbox inbox;

    CorrespondenceController(CorrespondenceInbox inbox) { this.inbox = inbox; }

    @PostMapping("/api/publication/contact")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void submit(@Valid @RequestBody CorrespondenceInbox.MessageInput message, HttpServletRequest request) {
        inbox.submit(message, request.getRemoteAddr());
    }

    @GetMapping("/api/admin/publication/inbox")
    @PreAuthorize("@access.hasAny('ADMIN')")
    CorrespondenceInbox.Page list(@RequestParam(defaultValue = "true") boolean open,
                                  @RequestParam(defaultValue = "1") @Min(1) @Max(1000000) int page) {
        return inbox.list(open, page);
    }

    @PatchMapping("/api/admin/publication/inbox/{id}")
    @PreAuthorize("@access.hasAny('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resolve(@PathVariable UUID id, @Valid @RequestBody Resolution resolution) {
        inbox.resolve(id, resolution.version(), resolution.resolved());
    }

    @DeleteMapping("/api/admin/publication/inbox/{id}")
    @PreAuthorize("@access.hasAny('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id, @Valid @RequestBody Removal removal) {
        inbox.delete(id, removal.version());
    }

    @ExceptionHandler(CorrespondenceInbox.IntakeLimit.class)
    ResponseEntity<ProblemDetail> throttled(CorrespondenceInbox.IntakeLimit limit) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, Long.toString(limit.retryAfterSeconds))
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
                        "The contact form has reached its submission limit. Please try again later."));
    }
}
