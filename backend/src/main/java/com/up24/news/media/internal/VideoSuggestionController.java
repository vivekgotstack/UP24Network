package com.up24.news.media.internal;

import com.up24.news.identity.Access;
import com.up24.news.identity.Accounts;
import com.up24.news.identity.WorkflowPolicies;
import com.up24.news.media.VideoSuggestions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
class VideoSuggestionController {
    record Input(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{11}") String videoId) {}
    private final VideoSuggestions suggestions;
    private final WorkflowPolicies workflows;
    private final Access access;
    VideoSuggestionController(VideoSuggestions suggestions,WorkflowPolicies workflows,Access access) { this.suggestions=suggestions;this.workflows=workflows;this.access=access; }
    @PostMapping("/api/admin/assist/video") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    VideoSuggestions.Video youtube(@Valid @RequestBody Input input) {
        var actor=access.current();
        if(actor.role()!=Accounts.Role.ADMIN && !workflows.get(actor.id()).autofill())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Draft helpers are disabled for this account by the administrator.");
        return suggestions.youtube(input.videoId());
    }
}
