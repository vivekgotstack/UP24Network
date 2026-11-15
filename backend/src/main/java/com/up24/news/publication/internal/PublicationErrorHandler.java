package com.up24.news.publication.internal;

import com.up24.news.publication.PublicationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class PublicationErrorHandler {
    @ExceptionHandler(PublicationException.class) ProblemDetail publicationError(PublicationException exception) {
        return ProblemDetail.forStatusAndDetail(switch(exception.reason()) {
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
        },exception.getMessage());
    }
}
