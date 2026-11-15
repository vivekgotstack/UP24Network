package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts.Account;
import java.time.Instant;
import java.util.UUID;

interface AccessTokenIssuer {
    String issue(Account account, UUID sessionId, Instant now, Instant expiresAt);
}
