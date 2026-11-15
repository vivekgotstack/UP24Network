package com.up24.news.article.internal;

import com.up24.news.article.ArticleOperationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.net.URI;

@RestControllerAdvice
class ArticleErrorHandler {
    @ExceptionHandler(ArticleOperationException.class)
    ProblemDetail articleError(ArticleOperationException exception) {
        var status=switch(exception.reason()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_ACTION -> HttpStatus.BAD_REQUEST;
            case CONFLICT -> HttpStatus.CONFLICT;
        };
        var detail=ProblemDetail.forStatusAndDetail(status,exception.getMessage());
        if (status==HttpStatus.CONFLICT) detail.setType(URI.create("urn:up24:article-version-conflict"));
        return detail;
    }
}
