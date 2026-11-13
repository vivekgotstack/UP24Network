package com.up24.news.article.internal;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Staff reporting requirements, separate from persistence and administrative shortcuts. */
final class ReportingRequirements {
    private ReportingRequirements() {}
    static void check(String city,String image,String imageAlt,String video,String youtube,String sourceNotes) {
        if (city==null || city.isBlank()) reject("Add a location or dateline for this report.");
        if (sourceNotes==null || sourceNotes.isBlank()) reject("Add your reporting sources and verification notes.");
        boolean photograph=image!=null && !image.isBlank() && !image.startsWith("/brand/");
        boolean footage=(video!=null && !video.isBlank()) || (youtube!=null && !youtube.isBlank());
        if (!photograph && !footage) reject("Choose a report photograph or video.");
        if (photograph && (imageAlt==null || imageAlt.isBlank())) reject("Describe the photograph for readers using assistive technology.");
    }
    private static void reject(String detail) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,detail); }
}
