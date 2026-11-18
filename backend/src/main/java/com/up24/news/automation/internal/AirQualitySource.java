package com.up24.news.automation.internal;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@Component
class AirQualitySource implements AutomationSource {
    static final Duration MAX_AGE = Duration.ofHours(24);
    private final RestClient http;
    private final AirQualityReadings readings;
    private final Clock clock;
    private final String apiKey;

    AirQualitySource(RestClient.Builder builder, AirQualityReadings readings, Clock clock,
                     @Value("${up24.providers.weatherbit.api-key:}") String apiKey) {
        http = SourceClients.create(builder, "https://api.weatherbit.io");
        this.readings = readings;
        this.clock = clock;
        this.apiKey = apiKey.strip();
    }

    @Override public String key() { return "aqi"; }
    @Override public int minIntervalMinutes() { return 60; }
    @Override public int maxIntervalMinutes() { return 360; }

    @Override public Status status() {
        return new Status(!apiKey.isBlank(), apiKey.isBlank()
                ? "Set WEATHERBIT_API_KEY in the backend environment using a commercial subscription."
                : "US EPA AQI for " + readings.locations().size() + " selected cities. Each refresh uses one request per city.");
    }

    @Override public Prepared prepare() {
        var blocked = new AtomicReference<RestClientResponseException>();
        List<Callable<AirQualityReadings.Reading>> requests = readings.locations().stream()
                .<Callable<AirQualityReadings.Reading>>map(location -> () -> fetch(location, blocked)).toList();
        var valid = new ArrayList<AirQualityReadings.Reading>();
        // Cap concurrency and the total refresh time. A missing city never deletes a previous reading.
        try (var workers = Executors.newFixedThreadPool(6, Thread.ofVirtual().name("up24-aqi-", 0).factory())) {
            for (var result : workers.invokeAll(requests, 40, TimeUnit.SECONDS)) {
                if (result.isCancelled()) continue;
                var reading = result.get();
                if (reading != null) valid.add(reading);
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Air quality refresh was interrupted.");
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Air quality refresh could not be completed.");
        }
        if (blocked.get() != null) throw blocked.get();
        if (valid.isEmpty()) throw new IllegalStateException("No current air quality readings returned.");
        return () -> readings.save(valid, "weatherbit");
    }

    private AirQualityReadings.Reading fetch(AirQualityReadings.Location location,
            AtomicReference<RestClientResponseException> blocked) {
        if (blocked.get() != null) return null;
        try {
            var response = http.get().uri(uri -> uri.path("/v2.0/current")
                            .queryParam("lat", location.latitude())
                            .queryParam("lon", location.longitude())
                            .queryParam("key", "{key}").build(apiKey))
                    .retrieve().body(JsonNode.class);
            return decode(location.key(), response, clock.instant());
        } catch (RestClientResponseException exception) {
            int status = exception.getStatusCode().value();
            if (status == 401 || status == 403 || status == 429) blocked.compareAndSet(null, exception);
            return null;
        } catch (RestClientException exception) {
            return null;
        }
    }

    static AirQualityReadings.Reading decode(String key, JsonNode response, Instant now) {
        if (response == null) return null;
        JsonNode data = response.path("data").path(0);
        if (!"IN".equals(data.path("country_code").asText())) return null;
        JsonNode aqi = data.path("aqi");
        JsonNode ts = data.path("ts");
        if (!aqi.isIntegralNumber() || !aqi.canConvertToInt() || !ts.isIntegralNumber() || !ts.canConvertToLong()) return null;
        int index = aqi.asInt();
        long observed = ts.asLong();
        if (index < 0 || index > 10000 || observed < now.minus(MAX_AGE).getEpochSecond()
                || observed > now.plus(Duration.ofMinutes(15)).getEpochSecond()) return null;
        return new AirQualityReadings.Reading(key, index, Instant.ofEpochSecond(observed));
    }
}
