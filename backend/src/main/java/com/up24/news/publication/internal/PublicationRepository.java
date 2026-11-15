package com.up24.news.publication.internal;

import com.up24.news.publication.Publication.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

interface PublicationRepository {
    Settings settings();
    Optional<Document> page(String slug);
    List<Document> pages();
    boolean updateSettings(SettingsInput input, Instant now);
    boolean updatePage(String slug, DocumentInput input, Instant now);
    void seedSettings(SettingsInput input, Instant now);
    void seedPage(String slug, DocumentInput input, Instant now);
}
