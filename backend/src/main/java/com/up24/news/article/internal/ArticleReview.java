package com.up24.news.article.internal;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.up24.news.article.ArticleDesk;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

final class ArticleReview {
    private ArticleReview() {}

    enum Kind { PUBLISH, UPDATE }
    enum State { PENDING, APPROVED, RETURNED }

    record Checks(@NotNull @AssertTrue Boolean factsVerified, @NotNull @AssertTrue Boolean rightsVerified,
                  @NotNull @AssertTrue Boolean standardsVerified) {}

    record Submission(@NotNull @PositiveOrZero Long articleVersion, @NotNull @Valid ArticleDesk.Input input,
                      @NotBlank @Size(min = 20, max = 2000) String changeSummary,
                      @NotBlank @Size(min = 40, max = 4000) String verificationNotes,
                      @NotNull @Valid Checks checks) {}

    record Return(@NotBlank @Size(min = 12, max = 2000) String note) {}

    record Summary(UUID id, UUID articleId, long articleVersion, LocalDate reviewDay, Kind kind, State state, String title,
                   String submittedBy, Instant submittedAt, String changeSummary, String verificationNotes,
                   String decisionNote, Instant decidedAt) {}

    record Detail(@JsonUnwrapped Summary review, ArticleDesk.Input input, ArticleDesk.Managed current) {}
    record StaffHistory(List<Summary> reviews, ArticleDesk.Input latestInput) {}
    record Page(List<Summary> items, boolean hasNext) {}
}
