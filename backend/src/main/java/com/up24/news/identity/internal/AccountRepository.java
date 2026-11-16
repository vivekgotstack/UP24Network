package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts.Account;
import com.up24.news.identity.Accounts.Role;
import com.up24.news.identity.AccountAdministration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface AccountRepository {
    Optional<Account> find(String email);
    Optional<Account> find(UUID id);
    Optional<Account> lock(UUID id);
    List<Account> list();
    List<Account> administrators();
    AccountAdministration.Page browse(AccountAdministration.Query query);
    void insert(Account account, String encodedPassword);
    int lockAdministrators();
    void changeRole(UUID id, Role role);
    boolean update(UUID id,AccountAdministration.Profile input);
    boolean delete(UUID id,long version);
}
