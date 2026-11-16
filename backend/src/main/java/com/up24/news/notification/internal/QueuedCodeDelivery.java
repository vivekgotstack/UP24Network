package com.up24.news.notification.internal;

import com.up24.news.jobs.BackgroundJobs;
import com.up24.news.notification.LoginCodeDelivery;
import com.up24.news.notification.PasswordRecoveryDelivery;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.UUID;

@Component
@Profile("!local-preview")
class QueuedCodeDelivery implements LoginCodeDelivery,PasswordRecoveryDelivery {
    private final BackgroundJobs jobs;
    private final MailTransport transport;
    QueuedCodeDelivery(BackgroundJobs jobs,MailTransport transport) { this.jobs=jobs;this.transport=transport; }
    @Override public boolean configured() { return transport.configured(); }
    @Override public void send(String recipient,String code,Instant expiresAt) { enqueue(recipient,code,expiresAt,false); }
    @Override public void sendRecovery(String recipient,String code,Instant expiresAt) { enqueue(recipient,code,expiresAt,true); }
    private void enqueue(String recipient,String code,Instant expiresAt,boolean recovery) {
        if(!configured()) throw new IllegalStateException("Configure transactional email before requesting a code.");
        jobs.submit(CodeMail.TYPE,BackgroundJobs.Lane.MAIL,"mail:"+UUID.randomUUID(),new CodeMail(recipient,code,expiresAt,recovery),expiresAt);
    }
}
