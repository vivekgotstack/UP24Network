package com.up24.news.identity.internal;

import com.up24.news.identity.AccountException;
import com.up24.news.identity.Accounts.Account;
import com.up24.news.identity.Accounts.Role;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class JdbcAccountRepository implements AccountRepository, CredentialRepository {
    private static final String COLUMNS = "id,email,display_name,role";
    private static final RowMapper<Account> ACCOUNT = (row, index) -> new Account(
            row.getObject("id", UUID.class), row.getString("email"),
            row.getString("display_name"), Role.valueOf(row.getString("role")));
    private final JdbcTemplate jdbc;

    JdbcAccountRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public Optional<Account> find(String email) {
        return jdbc.query("SELECT " + COLUMNS + " FROM identity_account WHERE email=?", ACCOUNT, email).stream().findFirst();
    }
    @Override public Optional<Account> find(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM identity_account WHERE id=?", ACCOUNT, id).stream().findFirst();
    }
    @Override public List<Account> list() {
        return jdbc.query("SELECT " + COLUMNS + " FROM identity_account ORDER BY created_at DESC,id", ACCOUNT);
    }
    @Override public void insert(Account account, String hash) {
        try {
            jdbc.update("INSERT INTO identity_account(id,email,display_name,password_hash,role) VALUES (?,?,?,?,?)",
                    account.id(), account.email(), account.displayName(), hash, account.role().name());
        } catch (DuplicateKeyException exception) {
            throw new AccountException(AccountException.Reason.EMAIL_UNAVAILABLE, "That email is unavailable.");
        }
    }
    @Override public int lockAdministrators() {
        return jdbc.queryForList("SELECT id FROM identity_account WHERE role='ADMIN' ORDER BY id FOR UPDATE").size();
    }
    @Override public void changeRole(UUID id, Role role) {
        jdbc.update("UPDATE identity_account SET role=? WHERE id=?", role.name(), id);
    }
    @Override public Optional<Credential> findCredential(String email) {
        return jdbc.query("SELECT email,password_hash,role FROM identity_account WHERE email=?",
                (row, index) -> new Credential(row.getString("email"), row.getString("password_hash"), row.getString("role")), email)
                .stream().findFirst();
    }
    @Override public void upgradePassword(String email, String previousHash, String replacementHash) {
        // Never overwrite a password changed concurrently with an authentication upgrade.
        jdbc.update("UPDATE identity_account SET password_hash=? WHERE email=? AND password_hash=?", replacementHash, email, previousHash);
    }
}
