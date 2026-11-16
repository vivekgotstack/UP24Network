package com.up24.news.identity;

/** An application error; HTTP status selection belongs to the web adapter. */
public final class AccountException extends RuntimeException {
    public enum Reason { INVALID_INPUT, EMAIL_UNAVAILABLE, NOT_FOUND, CONFLICT }
    private final Reason reason;

    public AccountException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason reason() { return reason; }
}
