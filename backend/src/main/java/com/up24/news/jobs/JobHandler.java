package com.up24.news.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;

/** Versioned, explicitly registered job handlers; no Java class names cross the broker. */
public interface JobHandler {
    String type();
    void execute(UUID jobId,JsonNode payload) throws Exception;
}
