package com.up24.news.media.internal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Both upload and metadata adapters expose the same safe application errors. */
@RestControllerAdvice(basePackageClasses=MediaErrorHandler.class)
class MediaErrorHandler {
    @ExceptionHandler(MediaProblem.class)
    ProblemDetail problem(MediaProblem exception) {
        var status=switch(exception.reason) {
            case INVALID -> HttpStatus.BAD_REQUEST;
            case MISSING -> HttpStatus.NOT_FOUND;
            case IN_USE -> HttpStatus.CONFLICT;
            case STORAGE -> HttpStatus.SERVICE_UNAVAILABLE;
            case QUOTA -> HttpStatus.INSUFFICIENT_STORAGE;
        };
        return ProblemDetail.forStatusAndDetail(status,exception.getMessage());
    }
}
