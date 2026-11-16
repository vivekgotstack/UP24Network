package com.up24.news.jobs.internal;

import com.up24.news.jobs.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
class JobRunner {
    private final JobStore store;
    private final JobPayloadCodec codec;
    private final Map<String,JobHandler> handlers=new HashMap<>();
    private final Map<UUID,UUID> active=new ConcurrentHashMap<>();
    JobRunner(JobStore store,JobPayloadCodec codec,List<JobHandler> registered) {
        this.store=store;this.codec=codec;
        for(var handler:registered) if(handlers.put(handler.type(),handler)!=null) throw new IllegalStateException("Duplicate background job handler.");
    }
    void run(UUID id) {
        var claimed=store.start(id);if(claimed.isEmpty()) return;
        var job=claimed.get();active.put(id,job.lease());
        try {
            var handler=handlers.get(job.type());if(handler==null) throw new PermanentJobFailure();
            handler.execute(id,codec.decode(id,job.payload()));store.finish(job);
        } catch(Exception exception) { store.fail(job,exception instanceof PermanentJobFailure); }
        finally { active.remove(id); }
    }
    @Scheduled(fixedDelay=30000,initialDelay=30000)
    public void heartbeat() { active.forEach(store::heartbeat); }
}
