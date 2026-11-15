package com.up24.news.publication;

public final class PublicationException extends RuntimeException {
    public enum Reason { INVALID_INPUT, NOT_FOUND, CONFLICT }
    private final Reason reason;
    public PublicationException(Reason reason, String message) { super(message); this.reason=reason; }
    public Reason reason() { return reason; }
}
