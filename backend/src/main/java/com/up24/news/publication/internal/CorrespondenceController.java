package com.up24.news.publication.internal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
class CorrespondenceController {
    record Resolution(@NotNull @Min(0) Integer version, @NotNull Boolean resolved,
                      @Size(max = 2000) String resolutionNote) {}
    record Preservation(@NotNull @Min(0) Integer version, @NotNull Boolean preserved) {}
    record Removal(@NotNull @Min(0) Integer version) {}

    private final CorrespondenceInbox inbox;

    CorrespondenceController(CorrespondenceInbox inbox) { this.inbox = inbox; }

    @PostMapping("/api/publication/contact")
    ResponseEntity<CorrespondenceInbox.Receipt> submit(@Valid @RequestBody CorrespondenceInbox.MessageInput message,
                                                       HttpServletRequest request) {
        var receipt = inbox.submit(message, request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).header(HttpHeaders.CACHE_CONTROL, "no-store").body(receipt);
    }

    @GetMapping("/api/admin/publication/inbox")
    @PreAuthorize("@access.hasAny('ADMIN')")
    CorrespondenceInbox.Page list(@RequestParam(defaultValue = "true") boolean open,
                                  @RequestParam(required = false) CorrespondenceInbox.Topic topic,
                                  @RequestParam(required = false) UUID reference,
                                  @RequestParam(defaultValue = "1") @Min(1) @Max(1000000) int page) {
        return inbox.list(open, topic, reference, page);
    }

    @PatchMapping("/api/admin/publication/inbox/{id}")
    @PreAuthorize("@access.hasAny('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resolve(@PathVariable UUID id, @Valid @RequestBody Resolution resolution) {
        inbox.resolve(id, resolution.version(), resolution.resolved(), resolution.resolutionNote());
    }

    @PatchMapping("/api/admin/publication/inbox/{id}/preservation")
    @PreAuthorize("@access.hasAny('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void preserve(@PathVariable UUID id, @Valid @RequestBody Preservation preservation) {
        inbox.preserve(id, preservation.version(), preservation.preserved());
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
