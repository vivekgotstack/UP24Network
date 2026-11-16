package com.up24.news.identity.internal;

import com.up24.news.identity.Accounts;
import com.up24.news.notification.PasswordRecoveryDelivery;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
class PasswordRecoveryService {
    private static final Logger log=LoggerFactory.getLogger(PasswordRecoveryService.class);
    private final AccountRepository accounts;
    private final CredentialRepository credentials;
    private final PasswordRecoveryStore recovery;
    private final LoginSessionStore sessions;
    private final LoginAttemptBuckets attempts;
    private final PasswordEncoder passwords;
    private final PasswordRecoveryDelivery delivery;
    private final TaskExecutor executor;
    private final Clock clock;
    private final SecretKeySpec key;
    private final SecureRandom random=new SecureRandom();
    PasswordRecoveryService(AccountRepository accounts,CredentialRepository credentials,PasswordRecoveryStore recovery,
            LoginSessionStore sessions,LoginAttemptBuckets attempts,PasswordEncoder passwords,PasswordRecoveryDelivery delivery,
            @Qualifier("passwordRecoveryExecutor") TaskExecutor executor,Clock clock,
            @Value("${up24.newsroom.otp-secret}") String secret) {
        this.accounts=accounts; this.credentials=credentials; this.recovery=recovery; this.sessions=sessions;
        this.attempts=attempts; this.passwords=passwords; this.delivery=delivery; this.executor=executor; this.clock=clock;
        if(!secret.matches("[a-fA-F0-9]{64}")) throw new IllegalStateException("Configure the account recovery protection secret.");
        key=new SecretKeySpec(HexFormat.of().parseHex(secret),"HmacSHA256");
    }
    private String digest(String value) {
        try {
            var mac=Mac.getInstance("HmacSHA256"); mac.init(key);
            return HexFormat.of().formatHex(mac.doFinal(("UP24/password-recovery/v1\0"+value).getBytes(StandardCharsets.UTF_8)));
        } catch(GeneralSecurityException exception) { throw new IllegalStateException("Account recovery protection unavailable."); }
    }
    private boolean allow(String scope,String value,int limit,Instant now) {
        return attempts.recordAttempt(digest(scope+'\0'+value),now,now.plusSeconds(900),limit)
                .map(bucket -> bucket.attempts()<=limit).orElse(false);
    }
    void throttleCompletion(String address) {
        if(!allow("verify-address",address,60,clock.instant())) throw limited();
    }
    void request(String submittedEmail,String address) {
        String email=EmailAddresses.normalize(submittedEmail);
        var now=clock.instant();
        if(!allow("request-address",address,20,now)) throw limited();
        // Email limits return the same accepted response for known and unknown accounts.
        if(!allow("request-email",email,3,now)) return;
        try { executor.execute(() -> issue(email)); }
        catch(TaskRejectedException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Please try password recovery again shortly.");
        }
    }
    private void issue(String email) {
        UUID accountId=null,challenge=null;
        try {
            var account=accounts.find(email).filter(Accounts.Account::enabled)
                    .filter(value -> value.role()!=Accounts.Role.ADMIN);
            // The reserved administrator credential is controlled by the backend environment.
            if(account.isEmpty() || !delivery.configured()) return;
            accountId=account.get().id(); challenge=UUID.randomUUID();
            var now=clock.instant(); var expires=now.plusSeconds(600);
            String code=String.format(Locale.ROOT,"%06d",random.nextInt(1_000_000));
            if(recovery.reserve(accountId,account.get().version(),challenge,digest(challenge+":"+code),now,expires))
                delivery.sendRecovery(email,code,expires);
        } catch(RuntimeException exception) {
            if(accountId!=null && challenge!=null) recovery.invalidate(accountId,challenge);
            // Neither recipients, credentials, codes nor provider response bodies enter logs.
            log.warn("A password recovery delivery could not be completed.");
        }
    }
    @Transactional
    public boolean complete(String submittedEmail,String code,String password) {
        if(password==null || password.length()<12 || password.length()>64 || password.getBytes(StandardCharsets.UTF_8).length>72
                || code==null || !code.matches("[0-9]{6}")) return false;
        var candidate=accounts.find(EmailAddresses.normalize(submittedEmail));
        if(candidate.isEmpty()) return false;
        var account=accounts.lock(candidate.get().id()).orElse(null);
        if(account==null || !account.enabled() || account.role()==Accounts.Role.ADMIN) return false;
        var now=clock.instant();
        // A failed result must commit the attempt count rather than roll it back with an exception.
        if(!recovery.consume(account.id(),account.version(),id -> digest(id+":"+code),now)) return false;
        credentials.replacePassword(account.id(),passwords.encode(password));
        sessions.revokeAll(account.id(),now);
        return true;
    }
    private ResponseStatusException limited() {
        return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many recovery attempts. Please try again in 15 minutes.");
    }
}
