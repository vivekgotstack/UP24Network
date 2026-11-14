package com.up24.news.article;

import java.util.List;
import java.util.Locale;

/** Bounded public discovery criteria, independent of HTTP and persistence. */
public record ArticleQuery(List<String> categories, List<String> cities, String region, String search,
                           boolean videoOnly, int page, int size) {
    public ArticleQuery {
        categories = filters(categories, 32);
        cities = filters(cities, 64).stream().map(value -> value.toLowerCase(Locale.ROOT)).toList();
        region = region == null ? "" : region.trim();
        if (region.length() > 80 || !region.matches("^$|[a-z]+(?:-[a-z]+)*"))
            throw new IllegalArgumentException("Use a valid regional edition slug");
        search = search == null ? "" : search.trim();
        if (search.length() > 200 || page < 1 || page > 100_000 || size < 1 || size > 48)
            throw new IllegalArgumentException("Use a search of at most 200 characters, page 1–100000 and size 1–48");
    }

    private static List<String> filters(List<String> values, int maximum) {
        if (values == null) return List.of();
        if (values.size() > maximum || values.stream().anyMatch(value -> value == null || value.length() > 100))
            throw new IllegalArgumentException("Too many or oversized article filters");
        return values.stream().map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
    }
}
