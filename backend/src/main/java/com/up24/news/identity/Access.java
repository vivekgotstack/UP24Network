package com.up24.news.identity;

/** Current actor contract, independent of session and storage details. */
public interface Access {
    Accounts.Account current();
    boolean hasAny(String... roles);
}
