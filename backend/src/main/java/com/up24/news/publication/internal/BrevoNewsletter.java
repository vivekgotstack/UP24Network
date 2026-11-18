package com.up24.news.publication.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Set;

@Component
class BrevoNewsletter {
    static final class Unavailable extends RuntimeException {}

    private static final Logger log = LoggerFactory.getLogger(BrevoNewsletter.class);
    private static final String CONFIRMED_PAGE = "/newsletter?confirmed=1";
    private static final Set<String> DUPLICATE_CODES = Set.of("duplicate_parameter", "duplicate_request");
    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");

    private final RestClient api;
    private final ObjectMapper json;
    private final String apiKey;
    private final long listId;
    private final long templateId;
    private final URI confirmationUrl;

    private record DoubleOptIn(String email, List<Long> includeListIds, long templateId, String redirectionUrl,
                               boolean contactPixelTrackingConsent) {}

    BrevoNewsletter(RestClient.Builder builder, ObjectMapper json,
                    @Value("${up24.providers.brevo.api-key:}") String apiKey,
                    @Value("${up24.newsletter.list-id:}") String listId,
                    @Value("${up24.newsletter.doi-template-id:}") String templateId,
                    @Value("${up24.newsletter.confirmation-url:}") String confirmation,
                    @Value("${up24.newsletter.site-url:}") String siteUrl) {
        this.json = json;
        this.apiKey = apiKey.strip();
        this.listId = positiveId(listId);
        this.templateId = positiveId(templateId);
        confirmationUrl = confirmationUrl(confirmation, siteUrl);
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(4)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(8));
        api = builder.clone().requestFactory(factory).baseUrl("https://api.brevo.com/v3").build();
    }

    boolean available() {
        return !apiKey.isBlank() && listId > 0 && templateId > 0 && confirmationUrl != null;
    }

    void requestConfirmation(String email) {
        if (!available()) throw new Unavailable();
        try {
            var response = api.post().uri("/contacts/doubleOptinConfirmation")
                    .header("api-key", apiKey).contentType(MediaType.APPLICATION_JSON)
                    .body(new DoubleOptIn(email, List.of(listId), templateId, confirmationUrl.toASCIIString(), false))
                    .retrieve().toBodilessEntity();
            if (response.getStatusCode().is2xxSuccessful()) return;
            log.warn("Newsletter confirmation request returned status {}", response.getStatusCode().value());
        } catch (RestClientResponseException failure) {
            if (duplicate(failure)) return;
            log.warn("Newsletter confirmation request returned status {}", failure.getStatusCode().value());
        } catch (RestClientException failure) {
            log.warn("Newsletter confirmation transport failed ({})", failure.getClass().getSimpleName());
        }
        throw new Unavailable();
    }

    private boolean duplicate(RestClientResponseException failure) {
        int responseStatus = failure.getStatusCode().value();
        byte[] response = failure.getResponseBodyAsByteArray();
        if ((responseStatus != 400 && responseStatus != 409) || response.length > 4096) return false;
        try {
            var body = json.readTree(response);
            return body != null && DUPLICATE_CODES.contains(body.path("code").asText());
        } catch (IOException ignored) {
            return false;
        }
    }

    private static long positiveId(String value) {
        try { return Math.max(0, Long.parseLong(value.strip())); }
        catch (NumberFormatException ignored) { return 0; }
    }

    private static URI confirmationUrl(String confirmation, String siteUrl) {
        try {
            URI url = confirmation.isBlank() ? URI.create(siteUrl.strip()).resolve(CONFIRMED_PAGE) : URI.create(confirmation.strip());
            String host = url.getHost();
            if (host == null || url.getUserInfo() != null || url.getFragment() != null) return null;
            if ("https".equalsIgnoreCase(url.getScheme()) ||
                    ("http".equalsIgnoreCase(url.getScheme()) && LOOPBACK_HOSTS.contains(host))) return url;
        } catch (IllegalArgumentException ignored) {
            // A malformed optional URL leaves newsletter signup disabled.
        }
        return null;
    }
}
