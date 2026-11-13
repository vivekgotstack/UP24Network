package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

@Component
@Order(0)
class AdminBootstrap implements ApplicationRunner {
    private final Accounts accounts;
    private final String email;
    private final String password;

    AdminBootstrap(Accounts accounts, @Value("${up24.bootstrap.admin-email:}") String email,
                   @Value("${up24.bootstrap.admin-password:}") String password) {
        this.accounts = accounts; this.email = email; this.password = password;
    }

    @Override public void run(ApplicationArguments arguments) {
        if (!email.isBlank() && !password.isBlank()
                && accounts.find(email).isEmpty())
            accounts.create(email, "UP24Network Admin", password, Accounts.Role.ADMIN);
        if (!email.isBlank()) accounts.find(email).filter(owner->owner.role()==Accounts.Role.ADMIN).ifPresent(owner ->
                accounts.list().stream().filter(account -> account.role()==Accounts.Role.ADMIN && !account.id().equals(owner.id()))
                        .forEach(account -> accounts.changeRole(account.id(),Accounts.Role.SUBSCRIBER,owner.id())));
    }
}
