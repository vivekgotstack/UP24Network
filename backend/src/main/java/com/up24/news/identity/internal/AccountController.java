package com.up24.news.identity.internal;

import com.up24.news.identity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
class AccountController {
    record Signup(@Email @NotBlank @Size(max=254) String email,@NotBlank @Size(max=100) String displayName,@NotBlank @Size(min=12,max=64) String password) {}
    record NewAccount(@Email @NotBlank @Size(max=254) String email,@NotBlank @Size(max=100) String displayName,@NotBlank @Size(min=12,max=64) String password,@NotNull Accounts.Role role) {}
    record RoleChange(@NotNull Accounts.Role role) {}
    private final Accounts accounts;
    private final Access access;
    AccountController(Accounts accounts,Access access) { this.accounts=accounts; this.access=access; }
    @GetMapping("/api/auth/csrf") Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @GetMapping("/api/auth/me") Accounts.Account me() { return access.current(); }
    @PostMapping("/api/auth/register") Accounts.Account register(@Valid @RequestBody Signup input) {
        return accounts.create(input.email(),input.displayName(),input.password(),Accounts.Role.SUBSCRIBER);
    }
    @GetMapping("/api/admin/accounts") @PreAuthorize("@access.hasAny('ADMIN')") List<Accounts.Account> list() { return accounts.list(); }
    @PostMapping("/api/admin/accounts") @PreAuthorize("@access.hasAny('ADMIN')") Accounts.Account create(@Valid @RequestBody NewAccount input) {
        return accounts.create(input.email(),input.displayName(),input.password(),input.role());
    }
    @PatchMapping("/api/admin/accounts/{id}") @PreAuthorize("@access.hasAny('ADMIN')") Accounts.Account role(@PathVariable UUID id,@Valid @RequestBody RoleChange input) {
        return accounts.changeRole(id,input.role(),access.current().id());
    }
}
