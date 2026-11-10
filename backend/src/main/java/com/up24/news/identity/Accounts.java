package com.up24.news.identity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Accounts {
    enum Role { ADMIN, EDITOR, REPORTER, SUBSCRIBER }
    record Account(UUID id, String email, String displayName, Role role) {}
    Optional<Account> find(String email);
    List<Account> list();
    Account create(String email, String displayName, String password, Role role);
    Account changeRole(UUID id, Role role, UUID actor);
}
