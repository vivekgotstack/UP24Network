package com.up24.news.identity.internal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
class JdbcLoginSessionStore implements LoginSessionStore {
    private final JdbcTemplate jdbc;
    JdbcLoginSessionStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    private static Instant instant(ResultSet row, String name) throws SQLException {
        var value = row.getTimestamp(name);
        return value == null ? null : value.toInstant();
    }
    private static Session session(ResultSet row) throws SQLException {
        return new Session(row.getObject("id", UUID.class), row.getObject("account_id", UUID.class),
                instant(row,"expires_at"), instant(row,"verified_until"), row.getString("verified_role"));
    }
    @Override public void create(UUID id, UUID accountId, Instant now, Instant expiresAt, String digest) {
        jdbc.update("INSERT INTO identity_login_session(id,account_id,created_at,expires_at) VALUES (?,?,?,?)",
                id, accountId, Timestamp.from(now), Timestamp.from(expiresAt));
        jdbc.update("INSERT INTO identity_refresh_token(digest,session_id,issued_at) VALUES (?,?,?)", digest,id,Timestamp.from(now));
    }
    @Override public Optional<Session> active(UUID id, Instant now) {
        return jdbc.query("SELECT * FROM identity_login_session WHERE id=? AND revoked_at IS NULL AND expires_at>?",
                (row,index) -> session(row),id,Timestamp.from(now)).stream().findFirst();
    }
    @Override public Optional<Refresh> lockRefresh(String digest) {
        return jdbc.query("""
                SELECT s.*,t.consumed_at FROM identity_login_session s
                JOIN identity_refresh_token t ON t.session_id=s.id WHERE t.digest=? FOR UPDATE OF s
                """, (row,index) -> new Refresh(session(row),instant(row,"consumed_at"),row.getTimestamp("revoked_at") != null),digest)
                .stream().findFirst();
    }
    @Override public void rotate(UUID id, String previous, String replacement, Instant now) {
        jdbc.update("UPDATE identity_refresh_token SET consumed_at=? WHERE digest=?",Timestamp.from(now),previous);
        jdbc.update("INSERT INTO identity_refresh_token(digest,session_id,issued_at) VALUES (?,?,?)",replacement,id,Timestamp.from(now));
    }
    @Override public void revoke(UUID id, Instant now) {
        jdbc.update("UPDATE identity_login_session SET revoked_at=COALESCE(revoked_at,?) WHERE id=?",Timestamp.from(now),id);
    }
    @Override public void revokeAll(UUID accountId, Instant now) {
        jdbc.update("UPDATE identity_login_session SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL",Timestamp.from(now),accountId);
    }
    @Override public void verify(UUID id, String role, Instant until) {
        jdbc.update("UPDATE identity_login_session SET verified_until=?,verified_role=? WHERE id=? AND revoked_at IS NULL",
                Timestamp.from(until),role,id);
    }
    @Override public void clearVerification(UUID id) {
        jdbc.update("UPDATE identity_login_session SET verified_until=NULL,verified_role=NULL WHERE id=?",id);
    }
}
