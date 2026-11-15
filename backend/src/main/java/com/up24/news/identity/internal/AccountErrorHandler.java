package com.up24.news.identity.internal;

import com.up24.news.identity.AccountException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class AccountErrorHandler {
    @ExceptionHandler(AccountException.class)
    ProblemDetail accountError(AccountException exception) {
        var status = switch (exception.reason()) {
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case EMAIL_UNAVAILABLE -> HttpStatus.CONFLICT;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
        };
        return ProblemDetail.forStatusAndDetail(status, exception.getMessage());
    }
}
