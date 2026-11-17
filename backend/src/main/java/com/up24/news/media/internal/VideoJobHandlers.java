package com.up24.news.media.internal;

import com.up24.news.jobs.JobHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;

@Configuration
class VideoJobHandlers {
    @Bean JobHandler videoEncoder(VideoService service) {
        return new JobHandler() {
            public String type() { return VideoService.PROCESS; }
            public void execute(UUID id,JsonNode payload) throws Exception { service.process(id,UUID.fromString(payload.path("videoId").asText())); }
        };
    }
    @Bean JobHandler videoRemoval(VideoService service) {
        return new JobHandler() {
            public String type() { return VideoService.DELETE; }
            public void execute(UUID id,JsonNode payload) throws Exception { service.deleteObjects(UUID.fromString(payload.path("videoId").asText())); }
        };
    }
}
