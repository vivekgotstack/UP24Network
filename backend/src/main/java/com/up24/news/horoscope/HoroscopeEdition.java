package com.up24.news.horoscope;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

public record HoroscopeEdition(LocalDate date, Instant fetchedAt, List<Reading> signs) {
    public static final ZoneId EDITION_ZONE = ZoneId.of("Asia/Kolkata");
    public static final List<String> SIGN_IDS = List.of("aries", "taurus", "gemini", "cancer", "leo", "virgo",
            "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces");

    public HoroscopeEdition {
        Objects.requireNonNull(date);
        Objects.requireNonNull(fetchedAt);
        signs = List.copyOf(signs);
        if (signs.size() != 12 || signs.stream().map(Reading::sign).distinct().count() != 12) {
            throw new IllegalArgumentException("A complete edition needs all 12 unique signs");
        }
    }

    public record Reading(String sign, String name, String reading, String luckyNumber, String luckyColour) {
        public Reading {
            if (!SIGN_IDS.contains(sign)) throw new IllegalArgumentException("Unknown zodiac sign");
            requireHindi(name, 100);
            requireHindi(reading, 10000);
            if (luckyNumber == null || luckyNumber.length() > 30 || luckyColour == null || luckyColour.length() > 100) {
                throw new IllegalArgumentException("Invalid daily reading details");
            }
        }

        private static void requireHindi(String text, int maximum) {
            if (text == null || text.isBlank() || text.length() > maximum || !text.matches("(?s).*[\u0900-\u097F].*")) {
                throw new IllegalArgumentException("A Hindi reading is required");
            }
        }
    }
}
