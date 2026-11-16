package com.up24.news.identity.internal;

import com.up24.news.identity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
class AccountController {
    record Signup(@Email @NotBlank @Size(max=254) String email,@NotBlank @Size(max=100) String displayName,@NotBlank @Size(min=12,max=64) String password) {}
    record NewAccount(@Email @NotBlank @Size(max=254) String email,@NotBlank @Size(max=100) String displayName,@NotBlank @Size(min=12,max=64) String password,@NotNull Accounts.Role role) {}
    record RoleChange(@NotNull Accounts.Role role,@PositiveOrZero Long version) {}
    record Version(@NotNull @PositiveOrZero Long version) {}
    record SessionAccount(UUID id,String email,String displayName,Accounts.Role role,boolean newsroomEligible,boolean newsroomAccess) {}
    private final Accounts accounts;
    private final Access access;
    private final NewsroomPolicy newsroom;
    private final AccountAdministration administration;
    AccountController(Accounts accounts,Access access,NewsroomPolicy newsroom,AccountAdministration administration) {
        this.accounts=accounts; this.access=access; this.newsroom=newsroom; this.administration=administration;
    }
    @GetMapping("/api/auth/csrf") Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @GetMapping("/api/auth/me") SessionAccount me() {
        var account=access.current();
        return new SessionAccount(account.id(),account.email(),account.displayName(),account.role(),newsroom.eligible(account),newsroom.verified(account));
    }
    @PostMapping("/api/auth/register") Accounts.Account register(@Valid @RequestBody Signup input) {
        return accounts.create(input.email(),input.displayName(),input.password(),Accounts.Role.SUBSCRIBER);
    }
    @GetMapping("/api/admin/accounts") @PreAuthorize("@access.hasAny('ADMIN')") List<Accounts.Account> list() { return accounts.list(); }
    @GetMapping("/api/admin/accounts/browse") @PreAuthorize("@access.hasAny('ADMIN')")
    AccountAdministration.Page browse(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="1") int page,
            @RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="ALL") AccountAdministration.Scope scope) {
        try { return administration.browse(new AccountAdministration.Query(q,page,size,scope)); }
        catch(IllegalArgumentException exception) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,exception.getMessage()); }
    }
    @PostMapping("/api/admin/accounts") @PreAuthorize("@access.hasAny('ADMIN')") Accounts.Account create(@Valid @RequestBody NewAccount input) {
        return accounts.create(input.email(),input.displayName(),input.password(),input.role());
    }
    @PatchMapping("/api/admin/accounts/{id}") @PreAuthorize("@access.hasAny('ADMIN')") Accounts.Account role(@PathVariable UUID id,@Valid @RequestBody RoleChange input) {
        return accounts.changeRole(id,input.role(),access.current().id(),input.version());
    }
    @PatchMapping("/api/admin/accounts/{id}/profile") @PreAuthorize("@access.hasAny('ADMIN')")
    Accounts.Account profile(@PathVariable UUID id,@Valid @RequestBody AccountAdministration.Profile input) {
        return administration.update(id,input,access.current().id());
    }
    @PostMapping("/api/admin/accounts/{id}/sessions/revoke") @PreAuthorize("@access.hasAny('ADMIN')") @ResponseStatus(HttpStatus.NO_CONTENT)
    void revoke(@PathVariable UUID id,@Valid @RequestBody Version input) { administration.revokeLogins(id,input.version(),access.current().id()); }
    @DeleteMapping("/api/admin/accounts/{id}") @PreAuthorize("@access.hasAny('ADMIN')") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id,@Valid @RequestBody Version input) { administration.delete(id,input.version(),access.current().id()); }
}
