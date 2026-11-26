package com.up24.news.identity.internal;

import com.up24.news.PublicationBrand;
import com.up24.news.identity.Accounts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;

@Component
@Order(0)
class AdminBootstrap implements ApplicationRunner {
    private final Accounts accounts;
    private final String email;
    private final String password;
    private final CredentialRepository credentials;
    private final PasswordEncoder passwords;
    private final LoginSessions sessions;
    private final AccountRepository repository;

    AdminBootstrap(Accounts accounts, @Value("${up24.bootstrap.admin-email:}") String email,
                   @Value("${up24.bootstrap.admin-password:}") String password,
                   CredentialRepository credentials,PasswordEncoder passwords,LoginSessions sessions,AccountRepository repository) {
        this.accounts = accounts; this.email = email; this.password = password;
        this.credentials=credentials; this.passwords=passwords; this.sessions=sessions;
        this.repository=repository;
    }

    @Transactional @Override public void run(ApplicationArguments arguments) {
        if (email.isBlank()) return;
        if (password.isBlank() || password.length()<12 || password.length()>64 || password.getBytes(StandardCharsets.UTF_8).length>72)
            throw new IllegalStateException("Set a valid ADMIN_PASSWORD in the backend environment (12-64 characters, at most 72 UTF-8 bytes).");
        var owner=accounts.find(email).orElseGet(() -> accounts.create(email,PublicationBrand.NAME + " Admin",password,Accounts.Role.ADMIN));
        if (owner.role()!=Accounts.Role.ADMIN || !owner.enabled()) throw new IllegalStateException("The configured administrator account must be active and have the administrator role.");
        var stored=credentials.findCredential(owner.email()).orElseThrow();
        if (!passwords.matches(password,stored.encodedPassword())) {
            repository.lock(owner.id()).orElseThrow();
            credentials.replacePassword(owner.id(),passwords.encode(password));
            sessions.revokeAll(owner.id());
        }
        repository.administrators().stream().filter(account -> !account.id().equals(owner.id()))
                .forEach(account -> accounts.changeRole(account.id(),Accounts.Role.SUBSCRIBER,owner.id()));
    }
}
