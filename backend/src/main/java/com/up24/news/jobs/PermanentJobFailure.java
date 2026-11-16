package com.up24.news.jobs;

/** Stop retrying an invalid or permanently rejected job without exposing its payload. */
public class PermanentJobFailure extends RuntimeException {
    public PermanentJobFailure() { super("The background job cannot be completed."); }
}
