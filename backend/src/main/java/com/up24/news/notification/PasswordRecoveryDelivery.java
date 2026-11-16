package com.up24.news.notification;

import java.time.Instant;

/** Account recovery delivery without exposing a mail provider to identity. */
public interface PasswordRecoveryDelivery {
    boolean configured();
    void sendRecovery(String recipient, String code, Instant expiresAt);
}
