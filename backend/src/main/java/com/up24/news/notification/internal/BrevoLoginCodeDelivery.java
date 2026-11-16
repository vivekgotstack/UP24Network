package com.up24.news.notification.internal;

import com.up24.news.notification.LoginCodeDelivery;
import com.up24.news.notification.PasswordRecoveryDelivery;
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

@Component
class BrevoLoginCodeDelivery implements LoginCodeDelivery, PasswordRecoveryDelivery {
    private final RestClient client;
    private final String apiKey;
    private final String senderEmail;
    BrevoLoginCodeDelivery(RestClient.Builder builder,
            @Value("${up24.providers.brevo.api-key:}") String apiKey,
            @Value("${up24.providers.brevo.sender-email:}") String senderEmail) {
        this.apiKey = apiKey; this.senderEmail = senderEmail;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.client = builder.clone().requestFactory(factory).baseUrl("https://api.brevo.com/v3").build();
    }
    @Override public boolean configured() { return !apiKey.isBlank() && !senderEmail.isBlank(); }

    @Override public void send(String recipient, String code, Instant expiresAt) {
        sendCode(recipient,code,"Your UP24Network newsroom sign-in code",
                "Your newsroom sign-in code is: ","newsroom-login",5);
    }
    @Override public void sendRecovery(String recipient,String code,Instant expiresAt) {
        sendCode(recipient,code,"Reset your UP24Network password",
                "Your password reset code is: ","password-recovery",10);
    }
    private void sendCode(String recipient,String code,String subject,String introduction,String tag,int minutes) {
        if (!configured()) throw new IllegalStateException("Email delivery is not configured");
        // The code never enters URLs, logs, analytics, or browser API responses.
        try {
            client.post().uri("/smtp/email").header("api-key",apiKey).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("sender",Map.of("email",senderEmail,"name","UP24Network"),
                            "to",List.of(Map.of("email",recipient)),"subject",subject,
                            "textContent",introduction + code
                                    + "\n\nIt expires in " + minutes + " minutes and can be used once. Do not share this code."
                                    + "\n\nIf you did not request this email, you can safely ignore it. Your password has not changed.",
                            "tags",List.of(tag)))
                    .retrieve().toBodilessEntity();
        } catch (RuntimeException exception) {
            // Provider response bodies can contain private delivery details.
            throw new IllegalStateException("The sign-in email could not be delivered");
        }
    }
}
