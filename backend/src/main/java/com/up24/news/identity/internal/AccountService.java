package com.up24.news.identity.internal;

import com.up24.news.identity.AccountException;
import com.up24.news.identity.Accounts;
import jakarta.validation.Validator;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static com.up24.news.identity.AccountException.Reason.*;

@Service
class AccountService implements Accounts {
    private record Registration(@NotBlank @Email @Size(max=254) String email,
            @NotBlank @Size(max=100) String name, @NotBlank @Size(min=12,max=64) String password,
            @NotNull Role role) {
        @Override public String toString() { return "Registration[redacted]"; }
    }
    private final AccountRepository accounts;
    private final PasswordEncoder passwords;
    private final Validator validator;
    private final String administrator;

    AccountService(AccountRepository accounts, PasswordEncoder passwords, Validator validator,
                   @Value("${up24.newsroom.admin-email}") String administrator) {
        this.accounts = accounts;
        this.passwords = passwords;
        this.validator = validator;
        this.administrator = EmailAddresses.normalize(administrator);
    }

    @Override public Optional<Account> find(String email) { return accounts.find(EmailAddresses.normalize(email)); }
    @Override public Optional<Account> find(UUID id) { return accounts.find(id); }
    @Override public List<Account> list() { return accounts.list(); }

    @Override public Account create(String email, String name, String password, Role role) {
        var input = new Registration(EmailAddresses.normalize(email), name == null ? "" : name.strip(), password, role);
        if (!validator.validate(input).isEmpty()) throw new AccountException(INVALID_INPUT, "Provide a valid email, name and a password of 12–64 characters.");
        if (password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new AccountException(INVALID_INPUT, "The password must be at most 72 UTF-8 bytes.");
        if (input.email().equals(administrator) && role != Role.ADMIN)
            throw new AccountException(EMAIL_UNAVAILABLE, "That email is unavailable.");
        requireReservedAdministrator(input.email(), role);
        var account = new Account(UUID.randomUUID(), input.email(), input.name(), role);
        accounts.insert(account, passwords.encode(password));
        return account;
    }

    @Transactional @Override public Account changeRole(UUID id, Role role, UUID actor) {
        if (id == null || actor == null || role == null) throw new AccountException(INVALID_INPUT, "An account and role are required.");
        if (id.equals(actor)) throw new AccountException(INVALID_INPUT, "You cannot change your own role.");
        int administrators = accounts.lockAdministrators();
        var target = accounts.find(id).orElseThrow(() -> new AccountException(NOT_FOUND, "Account not found."));
        requireReservedAdministrator(target.email(), role);
        if (target.role() == Role.ADMIN && role != Role.ADMIN && administrators <= 1)
            throw new AccountException(INVALID_INPUT, "Keep at least one administrator.");
        accounts.changeRole(id, role);
        return new Account(id, target.email(), target.displayName(), role);
    }

    private void requireReservedAdministrator(String email, Role role) {
        if (role == Role.ADMIN && !email.equals(administrator))
            throw new AccountException(INVALID_INPUT, "The administrator role is reserved for the designated administrator.");
    }
}
