package com.up24.news.article.internal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;
import java.net.URI;

class ArticleConflictException extends ErrorResponseException {
    ArticleConflictException() {
        super(HttpStatus.CONFLICT, problem(), null);
    }
    private static ProblemDetail problem() {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "This report changed since you opened it. Review the latest saved version before trying again.");
        problem.setType(URI.create("urn:up24:article-version-conflict"));
        return problem;
    }
}
