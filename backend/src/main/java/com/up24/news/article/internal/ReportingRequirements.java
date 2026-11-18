package com.up24.news.article.internal;

import com.up24.news.article.ArticleDesk;
import com.up24.news.identity.WorkflowPolicies;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Staff reporting requirements, separate from persistence and administrative shortcuts. */
final class ReportingRequirements {
    private ReportingRequirements() {}
    static void staff(ArticleDesk.Input input, WorkflowPolicies.Policy policy) {
        if (input.byline() != null && !input.byline().isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only an administrator can override a byline.");
        }
        String footage = ArticleDesk.TRENDING_REELS.equals(input.category()) ? input.reelUrl() : input.videoUrl();
        check(input.city(), input.image(), input.imageAlt(), footage, input.youtubeId(), input.sourceNotes(), policy);
    }
    static void check(String city,String image,String imageAlt,String video,String youtube,String sourceNotes) {
        check(city,image,imageAlt,video,youtube,sourceNotes,null);
    }
    static void check(String city,String image,String imageAlt,String video,String youtube,String sourceNotes,WorkflowPolicies.Policy policy) {
        if ((policy==null || policy.requireDateline()) && (city==null || city.isBlank())) reject("Add a location or dateline for this report.");
        if ((policy==null || policy.requireSources()) && (sourceNotes==null || sourceNotes.isBlank())) reject("Add your reporting sources and verification notes.");
        boolean photograph=image!=null && !image.isBlank() && !image.trim().startsWith("/brand/");
        boolean footage=(video!=null && !video.isBlank()) || (youtube!=null && !youtube.isBlank());
        if ((policy==null || policy.requireMedia()) && !photograph && !footage) reject("Choose a report photograph or video.");
        if (photograph && (imageAlt==null || imageAlt.isBlank())) reject("Describe the photograph for readers using assistive technology.");
    }
    private static void reject(String detail) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,detail); }
}
