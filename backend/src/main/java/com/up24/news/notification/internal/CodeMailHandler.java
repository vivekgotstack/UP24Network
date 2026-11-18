package com.up24.news.notification.internal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.jobs.JobHandler;
import com.up24.news.jobs.PermanentJobFailure;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.util.UUID;

@Component
class CodeMailHandler implements JobHandler {
    private final MailTransport transport;
    private final ObjectMapper json;
    private final Clock clock;
    CodeMailHandler(MailTransport transport,ObjectMapper json,Clock clock) { this.transport=transport;this.json=json;this.clock=clock; }
    @Override public String type() { return CodeMail.TYPE; }
    @Override public void execute(UUID id,JsonNode payload) throws Exception {
        var mail=json.treeToValue(payload,CodeMail.class);
        if(mail.recipient()==null || mail.recipient().length()>254 || mail.code()==null || !mail.code().matches("[0-9]{6}") || mail.expiresAt()==null)
            throw new PermanentJobFailure();
        if(!clock.instant().isBefore(mail.expiresAt())) return;
        String subject=mail.recovery()?"Reset your UP24Network password":"Your UP24Network newsroom sign-in code";
        String introduction=mail.recovery()?"Your password reset code is: ":"Your newsroom sign-in code is: ";
        String tag=mail.recovery()?"password-recovery":"newsroom-login";
        transport.deliver(id,new MailMessage(mail.recipient(),subject,introduction + mail.code()
                + "\n\nIt expires at " + mail.expiresAt() + " and can be used once. Do not share this code."
                + "\n\nIf you did not request this email, you can safely ignore it. Your password has not changed.",tag));
    }
}
