package com.up24.news.automation.internal;

import com.fasterxml.jackson.databind.JsonNode;
import com.up24.news.horoscope.HoroscopeEdition;
import com.up24.news.horoscope.Horoscopes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;

@Component
class HindiHoroscopeSource implements AutomationSource {
    private final RestClient http;
    private final Horoscopes horoscopes;
    private final Clock clock;
    private final String apiKey;

    HindiHoroscopeSource(RestClient.Builder builder, Horoscopes horoscopes, Clock clock,
                         @Value("${up24.providers.astrologics.api-key:}") String apiKey) {
        this.http = SourceClients.create(builder, "https://api.astrologics.in");
        this.horoscopes = horoscopes;
        this.clock = clock;
        this.apiKey = apiKey.strip();
    }

    @Override public String key() { return "rashifal"; }
    @Override public Status status() {
        boolean ready = apiKey.startsWith("al_live_");
        return new Status(ready, ready ? "Hindi publisher feed configured. One complete edition is cached per day."
                : "Add an AstroLogics live key to the backend's local configuration; restart the backend. Test keys cannot publish.");
    }

    @Override public Prepared prepare() {
        LocalDate date = LocalDate.now(clock.withZone(HoroscopeEdition.EDITION_ZONE));
        if (horoscopes.hasEdition(date)) return () -> 0;
        JsonNode response = http.get().uri(uri -> uri.path("/v1/horoscope").queryParam("period", "daily")
                        .queryParam("lang", "hi").queryParam("date", date).build())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey).retrieve().body(JsonNode.class);
        HoroscopeEdition edition = decode(response, date, clock.instant());
        String requestId = required(response.path("meta"), "request_id", 200);
        String engine = required(response.path("meta"), "engine_version", 100);
        return () -> {
            horoscopes.save(edition, "astrologics", requestId, engine);
            return edition.signs().size();
        };
    }

    static HoroscopeEdition decode(JsonNode response, LocalDate expected, Instant fetchedAt) {
        if (response == null || !"live".equals(response.path("meta").path("mode").asText())) {
            throw new IllegalArgumentException("A live provider response is required");
        }
        JsonNode data = response.path("data");
        requireDay(data, expected);
        JsonNode signs = data.path("signs");
        if (!signs.isArray() || signs.size() != 12) throw new IllegalArgumentException("Incomplete publisher feed");
        var readings = new ArrayList<HoroscopeEdition.Reading>();
        for (JsonNode sign : signs) {
            requireDay(sign, expected);
            JsonNode hindi = sign.path("hindi");
            // Explicit Hindi fields prevent an English fallback from reaching the Hindi edition.
            readings.add(new HoroscopeEdition.Reading(required(sign, "sign", 30), required(hindi, "name", 100),
                    required(hindi, "reading", 10000), required(hindi.path("lucky"), "number", 30),
                    required(hindi.path("lucky"), "color", 100)));
        }
        readings.sort(java.util.Comparator.comparingInt(reading -> HoroscopeEdition.SIGN_IDS.indexOf(reading.sign())));
        return new HoroscopeEdition(expected, fetchedAt, readings);
    }

    private static void requireDay(JsonNode node, LocalDate expected) {
        if (!"daily".equals(node.path("period").asText()) || !expected.toString().equals(node.path("date").asText())) {
            throw new IllegalArgumentException("The provider returned a different edition date");
        }
    }

    private static String required(JsonNode node, String key, int maximum) {
        JsonNode value = node.path(key);
        if (!value.isTextual() || value.asText().isBlank() || value.asText().length() > maximum) {
            throw new IllegalArgumentException("Invalid publisher feed field: " + key);
        }
        return value.asText().strip();
    }

    @Override public Instant nextRun(Instant now, int intervalMinutes) {
        if (intervalMinutes != 1440) return AutomationSource.super.nextRun(now, intervalMinutes);
        return now.atZone(HoroscopeEdition.EDITION_ZONE).toLocalDate().plusDays(1)
                .atTime(LocalTime.of(0, 5)).atZone(HoroscopeEdition.EDITION_ZONE).toInstant();
    }
}
