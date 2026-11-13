package com.up24.news.notification;

import java.time.Instant;

/** Delivery port; identity never depends on a mail vendor or HTTP client. */
public interface LoginCodeDelivery {
    boolean configured();
    void send(String recipient, String code, Instant expiresAt);
}
