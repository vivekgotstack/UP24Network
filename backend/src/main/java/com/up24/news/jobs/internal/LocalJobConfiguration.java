package com.up24.news.jobs.internal;

import com.up24.news.jobs.BackgroundJobs;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@ConditionalOnProperty(name="up24.jobs.transport",havingValue="local",matchIfMissing=true)
class LocalJobConfiguration {
    @Bean ThreadPoolTaskExecutor mailJobExecutor() { return executor("mail-job-",2); }
    @Bean ThreadPoolTaskExecutor mediaJobExecutor() { return executor("media-job-",1); }
    private ThreadPoolTaskExecutor executor(String name,int size) {
        var result=new ThreadPoolTaskExecutor();result.setCorePoolSize(size);result.setMaxPoolSize(size);result.setQueueCapacity(size);
        result.setThreadNamePrefix(name);result.setAwaitTerminationSeconds(20);return result;
    }
    @Bean JobPublisher localJobPublisher(JobRunner runner,ThreadPoolTaskExecutor mailJobExecutor,ThreadPoolTaskExecutor mediaJobExecutor) {
        return job -> (job.lane()==BackgroundJobs.Lane.MAIL?mailJobExecutor:mediaJobExecutor).execute(()->runner.run(job.id()));
    }
}
