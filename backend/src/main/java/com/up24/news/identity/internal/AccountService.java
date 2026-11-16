package com.up24.news.identity.internal;

import com.up24.news.identity.AccountException;
import com.up24.news.identity.Accounts;
import com.up24.news.identity.AccountAdministration;
import jakarta.validation.Validator;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Clock;
import static com.up24.news.identity.AccountException.Reason.*;

@Service
class AccountService implements Accounts,AccountAdministration {
    private record Registration(@NotBlank @Email @Size(max=254) String email,
            @NotBlank @Size(max=100) String name, @NotBlank @Size(min=12,max=64) String password,
            @NotNull Role role) {
        @Override public String toString() { return "Registration[redacted]"; }
    }
    private final AccountRepository accounts;
    private final PasswordEncoder passwords;
    private final Validator validator;
    private final String administrator;
    private final LoginSessionStore sessions;
    private final Clock clock;

    AccountService(AccountRepository accounts, PasswordEncoder passwords, Validator validator,
                   @Value("${up24.newsroom.admin-email}") String administrator,LoginSessionStore sessions,Clock clock) {
        this.accounts = accounts;
        this.passwords = passwords;
        this.validator = validator;
        this.administrator = EmailAddresses.normalize(administrator);
        this.sessions=sessions; this.clock=clock;
    }

    @Override public Optional<Account> find(String email) { return accounts.find(EmailAddresses.normalize(email)); }
    @Override public Optional<Account> find(UUID id) { return accounts.find(id); }
    @Override public List<Account> list() { return accounts.list(); }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    @Override public AccountAdministration.Page browse(AccountAdministration.Query query) { return accounts.browse(query); }

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
        return changeRole(id,role,actor,null);
    }
    @Transactional @Override public Account changeRole(UUID id,Role role,UUID actor,Long version) {
        if (id == null || actor == null || role == null) throw new AccountException(INVALID_INPUT, "An account and role are required.");
        if (id.equals(actor)) throw new AccountException(INVALID_INPUT, "You cannot change your own role.");
        int administrators = accounts.lockAdministrators();
        var target = locked(id);
        if(version!=null) requireVersion(target,version);
        requireReservedAdministrator(target.email(), role);
        if (target.role() == Role.ADMIN && role != Role.ADMIN && administrators <= 1)
            throw new AccountException(INVALID_INPUT, "Keep at least one administrator.");
        accounts.changeRole(id, role);
        sessions.revokeAll(id,clock.instant());
        return accounts.find(id).orElseThrow();
    }

    @Transactional @Override public Account update(UUID id,AccountAdministration.Profile input,UUID actor) {
        if(input==null || !validator.validate(input).isEmpty()) throw new AccountException(INVALID_INPUT,"Provide a name, active status and current account version.");
        var target=locked(id);
        requireVersion(target,input.version());
        if(!input.enabled()) requireRemovable(target,actor);
        if(!accounts.update(id,input)) throw conflict();
        if(target.enabled()!=input.enabled()) sessions.revokeAll(id,clock.instant());
        return accounts.find(id).orElseThrow();
    }

    @Transactional @Override public void revokeLogins(UUID id,long version,UUID actor) {
        var target=locked(id);
        requireVersion(target,version);
        sessions.revokeAll(id,clock.instant());
    }

    @Transactional @Override public void delete(UUID id,long version,UUID actor) {
        var target=locked(id);
        requireVersion(target,version);
        requireRemovable(target,actor);
        if(target.enabled()) throw new AccountException(INVALID_INPUT,"Suspend the account before deleting it.");
        sessions.revokeAll(id,clock.instant());
        if(!accounts.delete(id,version)) throw conflict();
    }

    private Account locked(UUID id) {
        if(id==null) throw new AccountException(INVALID_INPUT,"An account is required.");
        return accounts.lock(id).orElseThrow(() -> new AccountException(NOT_FOUND,"Account not found."));
    }
    private void requireRemovable(Account target,UUID actor) {
        if(target.id().equals(actor) || target.role()==Role.ADMIN || target.email().equals(administrator))
            throw new AccountException(INVALID_INPUT,"Your own account and the designated administrator cannot be suspended or deleted.");
    }
    private void requireVersion(Account account,long version) { if(account.version()!=version) throw conflict(); }
    private AccountException conflict() { return new AccountException(CONFLICT,"This account changed. Reload it before saving."); }

    private void requireReservedAdministrator(String email, Role role) {
        if (role == Role.ADMIN && !email.equals(administrator))
            throw new AccountException(INVALID_INPUT, "The administrator role is reserved for the designated administrator.");
    }
}
