package com.up24.news.horoscope.internal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.horoscope.HoroscopeEdition;
import com.up24.news.horoscope.Horoscopes;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Optional;

@Service
class HoroscopeStore implements Horoscopes {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final Clock clock;

    HoroscopeStore(JdbcTemplate jdbc, ObjectMapper json, Clock clock) {
        this.jdbc = jdbc;
        this.json = json;
        this.clock = clock;
    }

    @Override public Optional<HoroscopeEdition> today() {
        LocalDate today = LocalDate.now(clock.withZone(HoroscopeEdition.EDITION_ZONE));
        return jdbc.query("""
                SELECT e.content FROM horoscope_edition e CROSS JOIN horoscope_settings s
                WHERE s.id = 1 AND s.visible AND e.edition_date = ?
                """, (row, index) -> {
            try { return json.readValue(row.getString("content"), HoroscopeEdition.class); }
            catch (JsonProcessingException exception) { throw new IllegalStateException("Invalid stored edition", exception); }
        }, today).stream().findFirst();
    }

    @Override public boolean hasEdition(LocalDate date) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM horoscope_edition WHERE edition_date = ?)", Boolean.class, date));
    }

    @Override public void save(HoroscopeEdition edition, String provider, String requestId, String engineVersion) {
        if (!edition.date().equals(LocalDate.now(clock.withZone(HoroscopeEdition.EDITION_ZONE)))) {
            throw new IllegalArgumentException("Only today's edition can be imported");
        }
        try {
            jdbc.update("""
                    INSERT INTO horoscope_edition(edition_date, content, provider, provider_request_id, engine_version)
                    VALUES (?, ?::jsonb, ?, ?, ?) ON CONFLICT(edition_date) DO NOTHING
                    """, edition.date(), json.writeValueAsString(edition), provider, requestId, engineVersion);
        } catch (JsonProcessingException exception) { throw new IllegalArgumentException("Invalid edition", exception); }
    }

    @Override public void setVisible(boolean visible) {
        jdbc.update("UPDATE horoscope_settings SET visible = ? WHERE id = 1", visible);
    }
}
