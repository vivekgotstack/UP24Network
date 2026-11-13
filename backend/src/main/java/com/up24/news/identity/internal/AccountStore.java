package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
class AccountStore implements Accounts {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final NewsroomPolicy newsroom;
    AccountStore(JdbcTemplate jdbc, PasswordEncoder encoder,NewsroomPolicy newsroom) {
        this.jdbc = jdbc; this.encoder = encoder; this.newsroom=newsroom;
    }
    private Account map(java.sql.ResultSet row, int index) throws java.sql.SQLException {
        return new Account(row.getObject("id", UUID.class),row.getString("email"),row.getString("display_name"),Role.valueOf(row.getString("role")));
    }
    private String normalized(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    @Override public Optional<Account> find(String email) {
        return jdbc.query("SELECT * FROM identity_account WHERE email=?",this::map,normalized(email)).stream().findFirst();
    }
    @Override public List<Account> list() { return jdbc.query("SELECT * FROM identity_account ORDER BY created_at DESC",this::map); }
    @Override public Account create(String email,String name,String password,Role role) {
        if (role==Role.ADMIN && !normalized(email).equals(newsroom.ownerEmail()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The administrator role is reserved for the owner.");
        if (password.length()<12 || password.getBytes(StandardCharsets.UTF_8).length>72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use a password of at least 12 characters and at most 72 UTF-8 bytes");
        var account = new Account(UUID.randomUUID(),normalized(email),name.trim(),role);
        try { jdbc.update("INSERT INTO identity_account(id,email,display_name,password_hash,role) VALUES (?,?,?,?,?)",
                account.id(),account.email(),account.displayName(),encoder.encode(password),role.name()); }
        catch (DuplicateKeyException exception) { throw new ResponseStatusException(HttpStatus.CONFLICT,"An account already uses that email"); }
        return account;
    }
    @Transactional @Override public Account changeRole(UUID id,Role role,UUID actor) {
        if (id.equals(actor)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"You cannot change your own role");
        jdbc.queryForList("SELECT id FROM identity_account WHERE role='ADMIN' ORDER BY id FOR UPDATE");
        var target = jdbc.query("SELECT * FROM identity_account WHERE id=?",this::map,id).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (role==Role.ADMIN && !target.email().equals(newsroom.ownerEmail()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The administrator role is reserved for the owner.");
        if (target.role()==Role.ADMIN && role!=Role.ADMIN && jdbc.queryForObject("SELECT count(*) FROM identity_account WHERE role='ADMIN'",Integer.class)<=1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Keep at least one administrator");
        jdbc.update("UPDATE identity_account SET role=? WHERE id=?",role.name(),id);
        return new Account(id,target.email(),target.displayName(),role);
    }
}
