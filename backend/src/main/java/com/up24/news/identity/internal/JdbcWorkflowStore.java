package com.up24.news.identity.internal;

import com.up24.news.identity.WorkflowPolicies;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
class JdbcWorkflowStore implements WorkflowStore {
    private final JdbcTemplate jdbc;
    JdbcWorkflowStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Override public Optional<WorkflowPolicies.Policy> find(UUID id) {
        return jdbc.query("SELECT * FROM identity_workflow WHERE account_id=?",(row,index) -> new WorkflowPolicies.Policy(id,
                row.getBoolean("require_dateline"),row.getBoolean("require_sources"),row.getBoolean("require_media"),
                row.getBoolean("autofill"),row.getString("default_category"),row.getString("default_city"),row.getLong("version")),id)
                .stream().findFirst();
    }
    @Override public boolean save(UUID id,WorkflowPolicies.Input input) {
        return jdbc.update("""
                INSERT INTO identity_workflow(account_id,require_dateline,require_sources,require_media,autofill,default_category,default_city,version)
                SELECT ?,?,?,?,?,?,?,1 WHERE ?=0 OR EXISTS(SELECT 1 FROM identity_workflow WHERE account_id=?)
                ON CONFLICT(account_id) DO UPDATE SET require_dateline=EXCLUDED.require_dateline,
                require_sources=EXCLUDED.require_sources,require_media=EXCLUDED.require_media,autofill=EXCLUDED.autofill,
                default_category=EXCLUDED.default_category,default_city=EXCLUDED.default_city,version=identity_workflow.version+1,
                updated_at=CURRENT_TIMESTAMP WHERE identity_workflow.version=?
                """,id,input.requireDateline(),input.requireSources(),input.requireMedia(),input.autofill(),input.defaultCategory().strip(),
                input.defaultCity().strip(),input.version(),id,input.version())==1;
    }
}
