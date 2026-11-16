package com.up24.news.notification.internal;

import java.util.UUID;

interface MailTransport {
    boolean configured();
    void deliver(UUID deliveryId,CodeMail message);
}
