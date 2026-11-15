package com.up24.news.article;

public final class ArticleOperationException extends RuntimeException {
    public enum Reason { NOT_FOUND, INVALID_ACTION, CONFLICT }
    private final Reason reason;
    public ArticleOperationException(Reason reason, String message) { super(message); this.reason=reason; }
    public Reason reason() { return reason; }
}
