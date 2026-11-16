package com.up24.news.identity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Accounts {
    enum Role { ADMIN, EDITOR, REPORTER, SUBSCRIBER }
    record Account(UUID id, String email, String displayName, Role role, boolean enabled, long version) {
        public Account(UUID id,String email,String displayName,Role role) { this(id,email,displayName,role,true,0); }
    }
    Optional<Account> find(String email);
    Optional<Account> find(UUID id);
    List<Account> list();
    Account create(String email, String displayName, String password, Role role);
    Account changeRole(UUID id, Role role, UUID actor);
    Account changeRole(UUID id,Role role,UUID actor,Long version);
}
