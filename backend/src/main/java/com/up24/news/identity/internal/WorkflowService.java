package com.up24.news.identity.internal;

import com.up24.news.identity.AccountException;
import com.up24.news.identity.Accounts;
import com.up24.news.identity.WorkflowPolicies;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
class WorkflowService implements WorkflowPolicies {
    private final WorkflowStore store;
    private final Accounts accounts;
    private final Validator validator;
    WorkflowService(WorkflowStore store,Accounts accounts,Validator validator) { this.store=store; this.accounts=accounts; this.validator=validator; }
    @Override public Policy get(UUID id) {
        return store.find(id).orElseGet(() -> new Policy(id,true,true,true,true,"Uttar Pradesh","",0));
    }
    @Transactional @Override public Policy save(UUID id,Input input) {
        if (!validator.validate(input).isEmpty()) throw new AccountException(AccountException.Reason.INVALID_INPUT,"Provide valid workflow settings.");
        accounts.find(id).orElseThrow(() -> new AccountException(AccountException.Reason.NOT_FOUND,"Account not found."));
        if (!store.save(id,input)) throw new WorkflowConflict();
        return get(id);
    }
    static final class WorkflowConflict extends RuntimeException {}
}
