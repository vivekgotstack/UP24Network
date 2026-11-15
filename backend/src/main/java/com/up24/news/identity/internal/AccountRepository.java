package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts.Account;
import com.up24.news.identity.Accounts.Role;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface AccountRepository {
    Optional<Account> find(String email);
    Optional<Account> find(UUID id);
    List<Account> list();
    void insert(Account account, String encodedPassword);
    int lockAdministrators();
    void changeRole(UUID id, Role role);
}
