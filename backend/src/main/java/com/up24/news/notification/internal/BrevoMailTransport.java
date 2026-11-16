package com.up24.news.notification.internal;

import com.up24.news.jobs.PermanentJobFailure;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
class BrevoMailTransport implements MailTransport {
    private final RestClient client;
    private final String apiKey;
    private final String senderEmail;
    private final ObjectMapper json;
    BrevoMailTransport(RestClient.Builder builder,ObjectMapper json,
            @Value("${up24.providers.brevo.api-key:}") String apiKey,
            @Value("${up24.providers.brevo.sender-email:}") String senderEmail) {
        this.apiKey = apiKey; this.senderEmail = senderEmail;this.json=json;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.client = builder.clone().requestFactory(factory).baseUrl("https://api.brevo.com/v3").build();
    }
    @Override public boolean configured() { return !apiKey.isBlank() && !senderEmail.isBlank(); }

    @Override public void deliver(UUID deliveryId,CodeMail mail) {
        String subject=mail.recovery()?"Reset your UP24Network password":"Your UP24Network newsroom sign-in code";
        String introduction=mail.recovery()?"Your password reset code is: ":"Your newsroom sign-in code is: ";
        String tag=mail.recovery()?"password-recovery":"newsroom-login";
        if (!configured()) throw new IllegalStateException("Email delivery is not configured");
        // The code never enters URLs, logs, analytics, or browser API responses.
        try {
            client.post().uri("/smtp/email").header("api-key",apiKey).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("sender",Map.of("email",senderEmail,"name","UP24Network"),
                            "to",List.of(Map.of("email",mail.recipient())),"subject",subject,
                            "headers",Map.of("IdempotencyKey",deliveryId.toString()),
                            "textContent",introduction + mail.code()
                                    + "\n\nIt expires at " + mail.expiresAt() + " and can be used once. Do not share this code."
                                    + "\n\nIf you did not request this email, you can safely ignore it. Your password has not changed.",
                            "tags",List.of(tag)))
                    .exchange((request,response) -> {
                        if(response.getStatusCode().is2xxSuccessful()) return true;
                        byte[] body=response.getBody().readNBytes(8193);
                        if(body.length<=8192) {
                            try { if("duplicate_parameter".equals(json.readTree(body).path("code").asText())) return true; }
                            catch(Exception ignored) { }
                        }
                        if(response.getStatusCode().is4xxClientError() && response.getStatusCode().value()!=429) throw new PermanentJobFailure();
                        throw new IllegalStateException("Transactional email is temporarily unavailable.");
                    });
        } catch(PermanentJobFailure exception) { throw exception;
        } catch (RuntimeException exception) {
            // Provider response bodies can contain private delivery details.
            throw new IllegalStateException("The sign-in email could not be delivered");
        }
    }
}
