package com.up24.news.article.internal;

import com.up24.news.article.ArticleDesk;
import com.up24.news.identity.WorkflowPolicies;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;

/** Staff reporting requirements, separate from persistence and administrative shortcuts. */
final class ReportingRequirements {
    private static final Pattern WORD = Pattern.compile("[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*");

    private ReportingRequirements() {}

    static void draft(ArticleDesk.Input input) {
        if (input.byline() != null && !input.byline().isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only an administrator can override a byline.");
        }
    }

    static void submission(ArticleDesk.Input input, WorkflowPolicies.Policy policy, boolean publishedUpdate) {
        staff(input, policy);
        boolean reel = ArticleDesk.TRENDING_REELS.equals(input.category());
        int minimumWords = reel ? 12 : publishedUpdate ? 25 : 120;
        if (WORD.matcher(input.body()).results().limit(minimumWords).count() < minimumWords) {
            reject("Write at least " + minimumWords + " words in the report before sending it for review.");
        }
        if (input.summary().strip().length() < 30) reject("Write a standfirst of at least 30 characters.");
        if (policy.requireSources() && input.sourceNotes().strip().length() < 25) {
            reject("Identify the origin of the information and how you verified it in the source notes.");
        }
        if (ArticleFieldPolicy.tags(input.tags()).size() < 2) reject("Add at least two distinct topic tags.");
        if (photograph(input) || footage(input)) {
            String credit = ArticleFieldPolicy.mediaCredit(input.mediaCredit());
            if (credit == null || credit.length() < 2) reject("Credit the photographer, video creator or media owner.");
        }
    }

    static void staff(ArticleDesk.Input input, WorkflowPolicies.Policy policy) {
        draft(input);
        if (policy.requireDateline() && !present(input.city())) reject("Add a location or dateline for this report.");
        if (policy.requireSources() && !present(input.sourceNotes())) reject("Add your reporting sources and verification notes.");
        if (policy.requireMedia() && !photograph(input) && !footage(input)) reject("Choose a report photograph or video.");
        if (photograph(input) && !present(input.imageAlt())) reject("Describe the photograph for readers using assistive technology.");
    }

    private static boolean photograph(ArticleDesk.Input input) {
        return !ArticleDesk.TRENDING_REELS.equals(input.category()) && present(input.image())
                && !input.image().strip().startsWith("/brand/");
    }

    private static boolean footage(ArticleDesk.Input input) {
        return present(input.reelUrl()) || present(input.videoUrl()) || present(input.youtubeId());
    }

    private static boolean present(String value) { return value != null && !value.isBlank(); }
    private static void reject(String detail) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,detail); }
}
