package com.up24.news.notification.internal;

import java.time.Instant;

record CodeMail(String recipient,String code,Instant expiresAt,boolean recovery) {
    static final String TYPE="notification.code.v1";
    @Override public String toString() { return "CodeMail[redacted]"; }
}
