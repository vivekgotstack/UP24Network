package com.up24.news.identity.internal;

import java.util.Locale;

final class EmailAddresses {
    private EmailAddresses() {}
    static String normalize(String value) {
        return value == null ? "" : value.strip().toLowerCase(Locale.ROOT);
    }
}
