package com.up24.news.notification.internal;

import com.up24.news.notification.LoginCodeDelivery;
import com.up24.news.notification.PasswordRecoveryDelivery;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

/** Local preview mailbox, never active in the normal application profile. */
@Component
@Primary
@Profile("local-preview")
class PreviewLoginCodeDelivery implements LoginCodeDelivery, PasswordRecoveryDelivery {
    @Override public boolean configured() { return true; }
    @Override public void send(String recipient,String code,Instant expiresAt) {
        write(recipient,code,expiresAt,"latest-message.txt");
    }
    @Override public void sendRecovery(String recipient,String code,Instant expiresAt) {
        write(recipient,code,expiresAt,"latest-recovery.txt");
    }
    private void write(String recipient,String code,Instant expiresAt,String filename) {
        try {
            Path mailbox=Path.of(".local","preview-mailbox").toAbsolutePath().normalize();
            Files.createDirectories(mailbox);
            // A single local mailbox avoids turning recipient input into filesystem paths.
            Files.writeString(mailbox.resolve(filename),"To: "+recipient+"\nCode: "+code+"\nExpires: "+expiresAt+"\nLocal preview only. No email was sent.\n");
        } catch(IOException exception) { throw new IllegalStateException("Could not deliver to the local preview mailbox"); }
    }
}
