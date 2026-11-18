package com.up24.news.notification.internal;

record MailMessage(String recipient, String subject, String body, String tag) {}
