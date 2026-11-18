package com.up24.news.article.internal;

import com.up24.news.article.ArticleDesk;
import com.up24.news.article.ArticleOperationException;
import com.up24.news.article.internal.ArticleReview.*;
import com.up24.news.identity.Accounts;
import com.up24.news.identity.WorkflowPolicies;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static com.up24.news.article.ArticleOperationException.Reason.*;

@Service
class ArticleReviewService {
    private final ArticleDesk articles;
    private final ArticleLifecycleStore lifecycle;
    private final ArticleReviewStore requests;
    private final ArticleDailyReviewStore daily;
    private final Accounts accounts;
    private final WorkflowPolicies workflows;

    ArticleReviewService(ArticleDesk articles, ArticleLifecycleStore lifecycle, ArticleReviewStore requests,
                         ArticleDailyReviewStore daily, Accounts accounts, WorkflowPolicies workflows) {
        this.articles = articles;
        this.lifecycle = lifecycle;
        this.requests = requests;
        this.daily = daily;
        this.accounts = accounts;
        this.workflows = workflows;
    }

    StaffHistory history(UUID articleId, Accounts.Account actor) {
        readableArticle(articleId, actor);
        return requests.history(articleId, actor.id());
    }

    Page page(State state, int page) { return requests.page(state, page); }

    Detail detail(UUID id) {
        var request = requests.find(id, false).orElseThrow(ArticleReviewService::missingReview);
        return new Detail(request.summary(), request.input(), articles.find(request.summary().articleId()).orElse(null));
    }

    @Transactional
    public ArticleDesk.Managed saveStaffDraft(UUID id, ArticleDesk.Input input, Accounts.Account actor) {
        lockArticle(id);
        var article = readableArticle(id, actor);
        if (!article.status().equals("DRAFT")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Published stories can only be changed through editorial review.");
        }
        requireNoPending(id);
        ReportingRequirements.staff(input, workflows.get(actor.id()));
        return articles.save(id, input, actor.id(), actor.displayName());
    }

    @Transactional
    public Summary submit(UUID id, Submission submission, Accounts.Account actor) {
        daily.lockContributor(actor.id());
        lockArticle(id);
        var article = readableArticle(id, actor);
        if (article.version() != submission.articleVersion()) {
            throw conflict("This article changed. Refresh its latest version before sending a proposal.");
        }
        requireNoPending(id);
        String summary = evidence(submission.changeSummary(), 20, "Change summary");
        String notes = evidence(submission.verificationNotes(), 40, "Verification notes");
        var proposed = submission.input();
        if (proposed.version() != null && proposed.version().longValue() != article.version()) {
            throw conflict("The proposal is based on a different article version.");
        }
        ReportingRequirements.staff(proposed, workflows.get(actor.id()));
        ArticleFieldPolicy.verifyProposal(proposed);
        var snapshot = new ArticleDesk.Input(proposed.title(), proposed.slug(), proposed.summary(), proposed.category(),
                proposed.city(), trimMedia(proposed.image()), proposed.imageAlt(), trimMedia(proposed.videoUrl()), proposed.youtubeId(),
                proposed.body(), article.version(), proposed.sourceNotes(), proposed.region());
        var kind = article.status().equals("DRAFT") ? Kind.PUBLISH : Kind.UPDATE;
        var review = requests.add(id, snapshot, kind, actor, summary, notes, daily.openDay(actor.id()));
        lifecycle.record(id, "SUBMIT_REVIEW", actor.id(), article.version());
        return review;
    }

    @Transactional
    public Summary approve(UUID id, Accounts.Account admin) {
        var request = lockPending(id);
        var review = request.summary();
        var article = articles.find(review.articleId()).orElseThrow(ArticleReviewService::missingArticle);
        String requiredStatus = review.kind() == Kind.PUBLISH ? "DRAFT" : "PUBLISHED";
        if (article.version() != review.articleVersion() || !article.status().equals(requiredStatus)) {
            throw conflict("This article changed after submission. Return the proposal for review against the latest version.");
        }
        var submitter = accounts.find(request.submitterId())
                .filter(actor -> actor.enabled() && (actor.role() == Accounts.Role.EDITOR
                        || (actor.role() == Accounts.Role.REPORTER && actor.id().equals(article.authorId()))))
                .orElseThrow(() -> conflict("This submitter no longer has permission for the article. Return the proposal instead."));
        ReportingRequirements.staff(request.input(), workflows.get(submitter.id()));
        var applied = articles.save(article.id(), request.input(), admin.id(), article.article().author());
        if (review.kind() == Kind.PUBLISH) {
            applied = articles.publish(applied.id(), applied.version(), true, false, admin.id());
        }
        var decision = requests.decide(id, State.APPROVED, admin.id(), null);
        lifecycle.record(article.id(), "APPROVE_REVIEW", admin.id(), applied.version());
        return decision;
    }

    @Transactional
    public Summary returnReview(UUID id, String reason, Accounts.Account admin) {
        String note = evidence(reason, 12, "Return note");
        daily.lockContributor(requests.contributorId(id).orElseThrow(ArticleReviewService::missingReview));
        var review = lockPending(id).summary();
        var decision = requests.decide(id, State.RETURNED, admin.id(), note);
        lifecycle.record(review.articleId(), "RETURN_REVIEW", admin.id(), review.articleVersion());
        daily.closeIfFinished(id, admin.id());
        return decision;
    }

    private ArticleReviewStore.PendingData lockPending(UUID id) {
        // Article lifecycle and review decisions always acquire locks in this order.
        lockArticle(requests.articleId(id).orElseThrow(ArticleReviewService::missingReview));
        var request = requests.find(id, true).orElseThrow(ArticleReviewService::missingReview);
        if (request.summary().state() != State.PENDING) throw conflict("This review already has a decision.");
        return request;
    }

    private void lockArticle(UUID articleId) {
        lifecycle.lock(articleId).orElseThrow(ArticleReviewService::missingArticle);
    }

    private ArticleDesk.Managed readableArticle(UUID id, Accounts.Account actor) {
        return articles.find(id).filter(article -> (article.status().equals("DRAFT") || article.status().equals("PUBLISHED"))
                && (actor.role() != Accounts.Role.REPORTER || actor.id().equals(article.authorId())))
                .orElseThrow(ArticleReviewService::missingArticle);
    }

    private void requireNoPending(UUID id) {
        if (requests.hasPending(id)) throw conflict("This article already has a pending review. Wait for the administrator's decision.");
    }

    private String evidence(String text, int minimum, String label) {
        String trimmed = text.strip();
        if (trimmed.length() < minimum || trimmed.indexOf('\0') >= 0) {
            throw new ArticleOperationException(INVALID_ACTION, label + " must include at least " + minimum + " characters of text.");
        }
        return trimmed;
    }

    private static ArticleOperationException missingArticle() { return new ArticleOperationException(NOT_FOUND, "Article not found."); }
    private static ArticleOperationException missingReview() { return new ArticleOperationException(NOT_FOUND, "Review request not found."); }
    private static ArticleOperationException conflict(String detail) { return new ArticleOperationException(CONFLICT, detail); }
    private static String trimMedia(String path) { return path == null ? null : path.trim(); }
}
