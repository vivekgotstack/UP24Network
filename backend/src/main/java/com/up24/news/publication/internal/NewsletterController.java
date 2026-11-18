package com.up24.news.publication.internal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;

@RestController
@RequestMapping("/api/publication/newsletter")
class NewsletterController {
    private static final Logger log = LoggerFactory.getLogger(NewsletterController.class);
    record Availability(boolean available) {}
    record Signup(@NotBlank @Email @Size(max = 254) String email) {}

    private final BrevoNewsletter newsletter;
    private final NewsletterSignupThrottle throttle;

    NewsletterController(BrevoNewsletter newsletter, NewsletterSignupThrottle throttle) {
        this.newsletter = newsletter;
        this.throttle = throttle;
    }

    @GetMapping Availability availability() { return new Availability(newsletter.available()); }

    @PostMapping @ResponseStatus(HttpStatus.NO_CONTENT)
    void signup(@Valid @RequestBody Signup input, HttpServletRequest request) {
        if (!newsletter.available()) throw new BrevoNewsletter.Unavailable();
        String email = input.email().strip().toLowerCase(Locale.ROOT);
        var pending = throttle.reserve(email, request.getRemoteAddr());
        if (pending.isEmpty()) return;
        try {
            newsletter.requestConfirmation(email);
        } catch (BrevoNewsletter.Unavailable failure) {
            try { throttle.release(pending.get()); }
            catch (DataAccessException ignored) { log.warn("Newsletter reservation could not be released."); }
            throw failure;
        }
    }

    @ExceptionHandler(NewsletterSignupThrottle.LimitReached.class)
    ResponseEntity<ProblemDetail> throttled(NewsletterSignupThrottle.LimitReached limit) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, Long.toString(limit.retryAfterSeconds))
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
                        "Too many newsletter requests. Please try again later."));
    }

    @ExceptionHandler({BrevoNewsletter.Unavailable.class, DataAccessException.class})
    ProblemDetail unavailable() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
                "Newsletter signup is temporarily unavailable. Please try again later.");
    }
}
