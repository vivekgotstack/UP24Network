package com.up24.news.publication.internal;

import com.up24.news.publication.Publication;
import com.up24.news.publication.PublicationException;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import static com.up24.news.publication.PublicationException.Reason.*;

@Service
class PublicationService implements Publication {
    private final PublicationRepository repository;
    private final Validator validator;
    private final Clock clock;
    PublicationService(PublicationRepository repository, Validator validator, Clock clock) {
        this.repository=repository; this.validator=validator; this.clock=clock;
    }
    @Override public Settings settings() { return repository.settings(); }
    @Override public List<Document> pages() { return repository.pages(); }
    @Override public Optional<Document> page(String slug) { return repository.page(slug); }

    private void validate(Object input) {
        if (input==null || !validator.validate(input).isEmpty())
            throw new PublicationException(INVALID_INPUT,"Complete the required fields and keep the content within the published limits.");
    }
    @Transactional @Override public Settings saveSettings(SettingsInput input) {
        validate(input);
        if (input.announcementEnabled() && input.announcement().isBlank())
            throw new PublicationException(INVALID_INPUT,"Add announcement text before enabling the announcement.");
        if (!repository.updateSettings(input,clock.instant()))
            throw new PublicationException(CONFLICT,"Settings changed in another window. Reload before saving again.");
        return repository.settings();
    }
    @Transactional @Override public Document savePage(String slug, DocumentInput input) {
        validate(input);
        if (repository.page(slug).isEmpty()) throw new PublicationException(NOT_FOUND,"Publication page not found.");
        var ids=new HashSet<String>();
        for (var section:input.sections()) {
            if (!ids.add(section.id())) throw new PublicationException(INVALID_INPUT,"Each section needs a unique anchor.");
            if (section.links()!=null) for (var link:section.links()) {
                if (!link.href().matches("/[A-Za-z0-9/#?=&%._~-]*") || link.href().startsWith("//") || link.href().contains(".."))
                    throw new PublicationException(INVALID_INPUT,"Related links must point to a page on this publication.");
            }
        }
        if (!repository.updatePage(slug,input,clock.instant()))
            throw new PublicationException(CONFLICT,"This page changed in another window. Reload before saving again.");
        return repository.page(slug).orElseThrow();
    }
}
