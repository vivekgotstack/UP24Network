package com.up24.news.identity;

import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Administrative commands and bounded account discovery, separate from authentication. */
public interface AccountAdministration {
    enum Scope { ALL, STAFF, ADMIN, EDITOR, REPORTER, SUBSCRIBER }
    record Query(String search,int page,int size,Scope scope) {
        public Query {
            search=search==null?"":search.strip().toLowerCase(Locale.ROOT);
            if(search.length()>120 || page<1 || page>1_000_000 || size<1 || size>50)
                throw new IllegalArgumentException("Use a search of at most 120 characters and a page size from 1 to 50.");
            scope=scope==null?Scope.ALL:scope;
        }
    }
    record Page(List<Accounts.Account> items,long total,int page,int size,int pages) {}
    record Profile(@NotBlank @Size(max=100) String displayName,@NotNull Boolean enabled,@NotNull @PositiveOrZero Long version) {}
    Page browse(Query query);
    Accounts.Account update(UUID id,Profile input,UUID actor);
    void revokeLogins(UUID id,long version,UUID actor);
    void delete(UUID id,long version,UUID actor);
}
