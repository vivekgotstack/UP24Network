package com.up24.news.horoscope;

import java.time.LocalDate;
import java.util.Optional;

/** The module's publication API. Provider details never enter the public response. */
public interface Horoscopes {
    Optional<HoroscopeEdition> today();
    boolean hasEdition(LocalDate date);
    void save(HoroscopeEdition edition, String provider, String requestId, String engineVersion);
    void setVisible(boolean visible);
}
