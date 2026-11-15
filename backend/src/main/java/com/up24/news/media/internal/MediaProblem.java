package com.up24.news.media.internal;

class MediaProblem extends RuntimeException {
    enum Reason { INVALID, IN_USE, MISSING, STORAGE }
    final Reason reason;
    MediaProblem(Reason reason,String detail) { super(detail); this.reason=reason; }
}
