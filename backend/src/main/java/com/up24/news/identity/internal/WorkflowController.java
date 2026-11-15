package com.up24.news.identity.internal;

import com.up24.news.identity.Access;
import com.up24.news.identity.WorkflowPolicies;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
class WorkflowController {
    private final WorkflowPolicies policies;
    private final Access access;
    WorkflowController(WorkflowPolicies policies,Access access) { this.policies=policies; this.access=access; }
    @GetMapping("/api/auth/workflow") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    WorkflowPolicies.Policy mine() { return policies.get(access.current().id()); }
    @GetMapping("/api/admin/accounts/{id}/workflow") @PreAuthorize("@access.hasAny('ADMIN')")
    WorkflowPolicies.Policy get(@PathVariable UUID id) { return policies.get(id); }
    @PutMapping("/api/admin/accounts/{id}/workflow") @PreAuthorize("@access.hasAny('ADMIN')")
    WorkflowPolicies.Policy save(@PathVariable UUID id,@Valid @RequestBody WorkflowPolicies.Input input) { return policies.save(id,input); }
    @ExceptionHandler(WorkflowService.WorkflowConflict.class)
    ProblemDetail conflict() { return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,"Workflow settings changed. Reload before saving."); }
}
