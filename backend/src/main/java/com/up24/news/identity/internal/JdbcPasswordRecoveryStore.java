package com.up24.news.identity.internal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Function;

@Repository
class JdbcPasswordRecoveryStore implements PasswordRecoveryStore {
    private final JdbcTemplate jdbc;
    JdbcPasswordRecoveryStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Transactional @Override public boolean reserve(UUID accountId,long version,UUID challenge,String digest,Instant now,Instant expiresAt) {
        return jdbc.update("""
                INSERT INTO identity_password_recovery(account_id,account_version,challenge_id,code_digest,issued_at,expires_at)
                VALUES (?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE
                SET account_version=EXCLUDED.account_version,challenge_id=EXCLUDED.challenge_id,code_digest=EXCLUDED.code_digest,
                    issued_at=EXCLUDED.issued_at,expires_at=EXCLUDED.expires_at,attempts=0
                WHERE identity_password_recovery.issued_at<=?
                """,accountId,version,challenge,digest,Timestamp.from(now),Timestamp.from(expiresAt),Timestamp.from(now.minusSeconds(60)))==1;
    }
    @Override public boolean consume(UUID accountId,long version,Function<UUID,String> candidate,Instant now) {
        // The caller locks the account before this row. A concurrent reset can only win once.
        var matches=jdbc.query("SELECT * FROM identity_password_recovery WHERE account_id=? FOR UPDATE",(row,index) -> {
            String expected=row.getString("code_digest");
            return expected!=null && row.getInt("attempts")<5 && row.getLong("account_version")==version
                    && now.isBefore(row.getTimestamp("expires_at").toInstant())
                    && MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                            candidate.apply(row.getObject("challenge_id",UUID.class)).getBytes(StandardCharsets.US_ASCII));
        },accountId).stream().findFirst().orElse(false);
        jdbc.update("UPDATE identity_password_recovery SET attempts=LEAST(attempts+1,5),code_digest=CASE WHEN ? THEN NULL ELSE code_digest END WHERE account_id=?",matches,accountId);
        return matches;
    }
    @Override public void invalidate(UUID accountId,UUID challenge) {
        jdbc.update("UPDATE identity_password_recovery SET code_digest=NULL WHERE account_id=? AND challenge_id=?",accountId,challenge);
    }
}
