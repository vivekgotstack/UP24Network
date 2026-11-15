package com.up24.news.identity.internal;

import com.up24.news.identity.Access;
import com.up24.news.identity.Accounts;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth/newsroom")
class NewsroomOtpController {
    record Verification(@NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    private final Access access;
    private final NewsroomPolicy policy;
    private final EmailOtpService otp;
    private final CurrentLogin login;
    NewsroomOtpController(Access access,NewsroomPolicy policy,EmailOtpService otp,CurrentLogin login) {
        this.access=access; this.policy=policy; this.otp=otp; this.login=login;
    }
    private Accounts.Account staff() {
        var account=access.current();
        if (!policy.eligible(account)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This account has no newsroom access.");
        return account;
    }
    @PostMapping("/code") EmailOtpService.Issued send() {
        var account=staff();
        policy.clear();
        return otp.issue(account.email(),login.id().toString());
    }
    @PostMapping("/verify") @ResponseStatus(HttpStatus.NO_CONTENT)
    void verify(@Valid @RequestBody Verification input) {
        var account=staff();
        if (!otp.verify(account.email(),login.id().toString(),input.code()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"The code is invalid or expired. Request a new code after five unsuccessful attempts.");
        policy.markVerified(account);
    }
}
