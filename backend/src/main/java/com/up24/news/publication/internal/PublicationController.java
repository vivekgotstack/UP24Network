package com.up24.news.publication.internal;

import com.up24.news.publication.Publication;
import com.up24.news.publication.PublicationException;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
class PublicationController {
    private final Publication publication;
    PublicationController(Publication publication) { this.publication=publication; }
    @GetMapping("/api/publication/settings") Publication.Settings settings() { return publication.settings(); }
    @GetMapping("/api/publication/navigation") List<Publication.PageLink> navigation() { return publication.navigation(); }
    @GetMapping("/api/publication/pages/{slug}") Publication.Document page(@PathVariable String slug) {
        return publication.page(slug).orElseThrow(() -> new PublicationException(PublicationException.Reason.NOT_FOUND,"Publication page not found."));
    }
    @GetMapping("/api/admin/publication/pages") @PreAuthorize("@access.hasAny('ADMIN')")
    List<Publication.Document> pages() { return publication.pages(); }
    @GetMapping("/api/admin/publication/settings") @PreAuthorize("@access.hasAny('ADMIN')")
    Publication.Settings adminSettings() { return publication.settings(); }
    @PutMapping("/api/admin/publication/settings") @PreAuthorize("@access.hasAny('ADMIN')")
    Publication.Settings settings(@Valid @RequestBody Publication.SettingsInput input) { return publication.saveSettings(input); }
    @PutMapping("/api/admin/publication/pages/{slug}") @PreAuthorize("@access.hasAny('ADMIN')")
    Publication.Document page(@PathVariable String slug, @Valid @RequestBody Publication.DocumentInput input) { return publication.savePage(slug,input); }
}
