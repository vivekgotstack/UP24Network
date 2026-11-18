package com.up24.news.article.internal;

import com.up24.news.article.ArticleOperationException;
import com.up24.news.identity.Accounts;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import static com.up24.news.article.ArticleOperationException.Reason.CONFLICT;
import static com.up24.news.article.ArticleOperationException.Reason.INVALID_ACTION;
import static com.up24.news.article.ArticleOperationException.Reason.NOT_FOUND;

@Service
class ArticleDailyReviewService {
    private final ArticleDailyReviewStore daily;
    private final ArticleReviewStore reviews;
    private final ArticleReviewService approval;

    ArticleDailyReviewService(ArticleDailyReviewStore daily, ArticleReviewStore reviews, ArticleReviewService approval) {
        this.daily = daily;
        this.reviews = reviews;
        this.approval = approval;
    }

    ArticleDailyReviewStore.Page list(int page) { return daily.list(page); }

    @Transactional(readOnly = true)
    public ArticleDailyReviewStore.Detail detail(UUID contributor, LocalDate day) {
        return new ArticleDailyReviewStore.Detail(batch(contributor, day), reviews.itemsForDay(contributor, day));
    }

    @Transactional
    public int approve(UUID contributor, LocalDate day, List<UUID> expectedIds, Accounts.Account admin) {
        daily.lockContributor(contributor);
        var batch = batch(contributor, day);
        if (!batch.ready()) throw new ArticleOperationException(CONFLICT, "This batch is closed or scheduled for a later review day.");
        var pending = daily.pendingIds(contributor, day);
        if (pending.isEmpty() || pending.size() != expectedIds.size() || !new HashSet<>(expectedIds).containsAll(pending))
            throw new ArticleOperationException(CONFLICT, "This batch changed. Refresh and review the current submissions before approving.");
        for (UUID id : pending) approval.approve(id, admin);
        daily.close(contributor, day, admin.id());
        return pending.size();
    }

    @Transactional
    public ArticleDailyReviewStore.Batch recordReward(UUID contributor, LocalDate day, String note, Accounts.Account admin) {
        String details = note.strip();
        if (details.length() < 12 || details.indexOf('\0') >= 0)
            throw new ArticleOperationException(INVALID_ACTION, "Enter a valid reward record of at least 12 characters.");
        daily.lockContributor(contributor);
        var batch = batch(contributor, day);
        if (batch.closedAt() == null || batch.approvedCount() == 0)
            throw new ArticleOperationException(CONFLICT, "Approve at least one contribution before recording a reward.");
        if (daily.recordReward(contributor, day, admin.id(), details, batch.approvedCount()) == 0)
            throw new ArticleOperationException(CONFLICT, "A reward has already been recorded for this batch.");
        return batch(contributor, day);
    }

    private ArticleDailyReviewStore.Batch batch(UUID contributor, LocalDate day) {
        return daily.batch(contributor, day).orElseThrow(() -> new ArticleOperationException(NOT_FOUND, "Review batch not found."));
    }
}
