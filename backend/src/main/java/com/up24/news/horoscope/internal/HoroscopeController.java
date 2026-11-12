package com.up24.news.horoscope.internal;

import com.up24.news.horoscope.HoroscopeEdition;
import com.up24.news.horoscope.Horoscopes;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class HoroscopeController {
    private final Horoscopes horoscopes;
    HoroscopeController(Horoscopes horoscopes) { this.horoscopes = horoscopes; }

    @GetMapping("/api/horoscope/today")
    ResponseEntity<HoroscopeEdition> today() {
        return horoscopes.today().map(edition -> ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(edition))
                .orElseGet(() -> ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build());
    }
}
