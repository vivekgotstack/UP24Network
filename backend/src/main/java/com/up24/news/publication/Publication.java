package com.up24.news.publication;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** The publication contract contains editable content, never administrative credentials. */
public interface Publication {
    record Settings(String tagline, boolean announcementEnabled, String announcement, String footerDescription,
                    boolean showRashifal, boolean showVideo, boolean showCricketScores, long version, Instant updatedAt) {}
    record SettingsInput(@NotBlank @Size(max=160) String tagline, @NotNull Boolean announcementEnabled,
                         @NotNull @Size(max=400) String announcement, @NotNull @Size(max=600) String footerDescription,
                         @NotNull Boolean showRashifal, @NotNull Boolean showVideo,
                         @JsonInclude(JsonInclude.Include.NON_NULL) Boolean showCricketScores,
                         @NotNull @PositiveOrZero Long version) {}
    record Link(@NotBlank @Size(max=500) String href, @NotBlank @Size(max=100) String label) {}
    record Section(@NotBlank @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") @Size(max=80) String id,
                   @NotBlank @Size(max=250) String title,
                   @NotEmpty @Size(max=30) List<@NotBlank @Size(max=10000) String> paragraphs,
                   @Size(max=30) List<@NotBlank @Size(max=2000) String> points,
                   @Size(max=20) List<@NotNull @Valid Link> links) {}
    record Document(String path, String label, String title, String description, String intro,
                    List<Section> sections, long version, Instant updatedAt) {}
    record PageLink(String path, String label) {}
    record DocumentInput(@NotBlank @Size(max=100) String label, @NotBlank @Size(max=250) String title,
                         @NotBlank @Size(max=600) String description, @NotBlank @Size(max=1500) String intro,
                         @NotEmpty @Size(max=25) List<@NotNull @Valid Section> sections,
                         @NotNull @PositiveOrZero Long version) {}
    Settings settings();
    Settings saveSettings(SettingsInput input);
    List<Document> pages();
    List<PageLink> navigation();
    Optional<Document> page(String slug);
    Document savePage(String slug, DocumentInput input);
}
