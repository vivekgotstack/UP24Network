package com.up24.news.identity.internal;

import com.up24.news.identity.AccountException;
import com.up24.news.identity.Accounts.Account;
import com.up24.news.identity.Accounts.Role;
import com.up24.news.identity.AccountAdministration;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.HashMap;

@Repository
class JdbcAccountRepository implements AccountRepository, CredentialRepository {
    private static final String COLUMNS = "id,email,display_name,role,enabled,version";
    private static final RowMapper<Account> ACCOUNT = (row, index) -> new Account(
            row.getObject("id", UUID.class), row.getString("email"),
            row.getString("display_name"), Role.valueOf(row.getString("role")),row.getBoolean("enabled"),row.getLong("version"));
    private final JdbcTemplate jdbc;

    JdbcAccountRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public Optional<Account> find(String email) {
        return jdbc.query("SELECT " + COLUMNS + " FROM identity_account WHERE email=?", ACCOUNT, email).stream().findFirst();
    }
    @Override public Optional<Account> find(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM identity_account WHERE id=?", ACCOUNT, id).stream().findFirst();
    }
    @Override public Optional<Account> lock(UUID id) {
        return jdbc.query("SELECT "+COLUMNS+" FROM identity_account WHERE id=? FOR UPDATE",ACCOUNT,id).stream().findFirst();
    }
    @Override public List<Account> list() {
        return jdbc.query("SELECT " + COLUMNS + " FROM identity_account ORDER BY created_at DESC,id LIMIT 1000", ACCOUNT);
    }
    @Override public List<Account> administrators() {
        return jdbc.query("SELECT "+COLUMNS+" FROM identity_account WHERE role='ADMIN' ORDER BY id",ACCOUNT);
    }
    @Override public AccountAdministration.Page browse(AccountAdministration.Query query) {
        var where=new StringBuilder(" FROM identity_account WHERE TRUE");
        var values=new HashMap<String,Object>();
        if(query.scope()==AccountAdministration.Scope.STAFF) where.append(" AND role IN ('EDITOR','REPORTER')");
        else if(query.scope()!=AccountAdministration.Scope.ALL) { where.append(" AND role=:role");values.put("role",query.scope().name()); }
        if(!query.search().isBlank()) {
            where.append(" AND (lower(email) LIKE :prefix ESCAPE '!' OR lower(display_name) LIKE :prefix ESCAPE '!')");
            values.put("prefix",query.search().replace("!","!!").replace("%","!%").replace("_","!_")+"%");
        }
        var named=new NamedParameterJdbcTemplate(jdbc);
        long total=named.queryForObject("SELECT count(*)"+where,values,Long.class);
        int pages=Math.max(1,(int)Math.min(Integer.MAX_VALUE,Math.ceil((double)total/query.size())));
        int page=Math.min(query.page(),pages);
        values.put("size",query.size()); values.put("offset",(long)(page-1)*query.size());
        var items=named.query("SELECT "+COLUMNS+where+" ORDER BY created_at DESC,id LIMIT :size OFFSET :offset",values,ACCOUNT);
        return new AccountAdministration.Page(items,total,page,query.size(),pages);
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
        jdbc.update("UPDATE identity_account SET role=?,version=version+1 WHERE id=?", role.name(), id);
    }
    @Override public boolean update(UUID id,AccountAdministration.Profile input) {
        return jdbc.update("UPDATE identity_account SET display_name=?,enabled=?,version=version+1 WHERE id=? AND version=?",
                input.displayName().strip(),input.enabled(),id,input.version())==1;
    }
    @Override public boolean delete(UUID id,long version) {
        jdbc.update("DELETE FROM identity_newsroom_otp WHERE email=(SELECT email FROM identity_account WHERE id=?)",id);
        return jdbc.update("DELETE FROM identity_account WHERE id=? AND version=?",id,version)==1;
    }
    @Override public Optional<Credential> findCredential(String email) {
        return jdbc.query("SELECT email,password_hash,role,enabled,version FROM identity_account WHERE email=?",
                (row, index) -> new Credential(row.getString("email"), row.getString("password_hash"), row.getString("role"),row.getBoolean("enabled"),row.getLong("version")), email)
                .stream().findFirst();
    }
    @Override public void upgradePassword(String email, String previousHash, String replacementHash) {
        // Never overwrite a password changed concurrently with an authentication upgrade.
        jdbc.update("UPDATE identity_account SET password_hash=? WHERE email=? AND password_hash=?", replacementHash, email, previousHash);
    }
    @Override public void replacePassword(UUID accountId,String encodedPassword) {
        jdbc.update("UPDATE identity_account SET password_hash=?,version=version+1 WHERE id=?",encodedPassword,accountId);
    }
}
