package com.up24.news.article;

import java.time.Instant;
import java.time.LocalDate;

/** Queues private review notices for one India calendar day without changing the review state. */
public interface ArticleReviewNotices {
    boolean configured();
    int enqueue(LocalDate day, Instant expiresAt);
}
