package com.up24.news.automation.internal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.util.List;

@RestController
class AirQualityController {
    private final AirQualitySource source;
    private final AirQualityReadings readings;
    private final Clock clock;

    AirQualityController(AirQualitySource source, AirQualityReadings readings, Clock clock) {
        this.source = source;
        this.readings = readings;
        this.clock = clock;
    }

    @GetMapping("/api/air-quality")
    List<AirQualityReadings.City> latest() {
        return source.status().configured() ? readings.latest(clock.instant().minus(AirQualitySource.MAX_AGE)) : List.of();
    }
}
