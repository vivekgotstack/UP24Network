package com.up24.news.identity.internal;

import com.up24.news.identity.WorkflowPolicies;
import java.util.Optional;
import java.util.UUID;

interface WorkflowStore {
    Optional<WorkflowPolicies.Policy> find(UUID accountId);
    boolean save(UUID accountId,WorkflowPolicies.Input input);
}
