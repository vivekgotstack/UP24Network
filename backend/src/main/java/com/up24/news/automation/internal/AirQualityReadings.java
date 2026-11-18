package com.up24.news.automation.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;

@Repository
class AirQualityReadings {
    record Location(String key, String state, String city, double latitude, double longitude, boolean featured) {}
    record Reading(String key, int aqi, Instant observedAt) {}
    record City(String key, String state, String city, boolean featured, Integer aqi, Instant observedAt) {}

    private final JdbcTemplate jdbc;
    private final List<Location> locations;

    AirQualityReadings(JdbcTemplate jdbc, ObjectMapper json) throws IOException {
        this.jdbc = jdbc;
        try (var resource = new ClassPathResource("automation/air-quality-locations.json").getInputStream()) {
            locations = List.copyOf(json.readValue(resource, new TypeReference<List<Location>>() {}));
        }
    }

    List<Location> locations() { return locations; }

    List<City> latest(Instant minimumAge) {
        var readings = new HashMap<String, Reading>();
        jdbc.query("""
                SELECT location_key, aqi, observed_at FROM air_quality_reading
                WHERE observed_at >= ? AND EXISTS (SELECT 1 FROM automation_job WHERE job_key = 'aqi' AND enabled)
                """, (row, index) -> new Reading(row.getString(1), row.getInt(2), row.getTimestamp(3).toInstant()),
                Timestamp.from(minimumAge)).forEach(reading -> readings.put(reading.key(), reading));
        if (readings.isEmpty()) return List.of();
        return locations.stream().map(location -> {
            Reading reading = readings.get(location.key());
            return new City(location.key(), location.state(), location.city(), location.featured(),
                    reading == null ? null : reading.aqi(), reading == null ? null : reading.observedAt());
        }).toList();
    }

    int save(List<Reading> readings, String provider) {
        var changes = jdbc.batchUpdate("""
                INSERT INTO air_quality_reading (location_key, aqi, observed_at, provider) VALUES (?,?,?,?)
                ON CONFLICT (location_key) DO UPDATE SET aqi=excluded.aqi, observed_at=excluded.observed_at, provider=excluded.provider
                WHERE excluded.observed_at > air_quality_reading.observed_at
                """, readings, readings.size(), (statement, reading) -> {
            statement.setString(1, reading.key());
            statement.setInt(2, reading.aqi());
            statement.setTimestamp(3, Timestamp.from(reading.observedAt()));
            statement.setString(4, provider);
        });
        return (int) java.util.Arrays.stream(changes).flatMapToInt(java.util.Arrays::stream).filter(count -> count != 0).count();
    }
}
