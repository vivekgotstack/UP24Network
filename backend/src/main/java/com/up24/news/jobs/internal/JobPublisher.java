package com.up24.news.jobs.internal;

interface JobPublisher { void publish(JobStore.Dispatch job) throws Exception; }
