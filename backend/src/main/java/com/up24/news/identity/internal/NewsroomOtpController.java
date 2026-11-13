package com.up24.news.identity.internal;

import com.up24.news.identity.Access;
import com.up24.news.identity.Accounts;
import jakarta.servlet.http.HttpServletRequest;
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
    NewsroomOtpController(Access access,NewsroomPolicy policy,EmailOtpService otp) {
        this.access=access; this.policy=policy; this.otp=otp;
    }
    private Accounts.Account staff() {
        var account=access.current();
        if (!policy.eligible(account)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This account has no newsroom access.");
        return account;
    }
    @PostMapping("/code") EmailOtpService.Issued send(HttpServletRequest request) {
        var account=staff();
        var session=request.getSession();
        policy.clear(session);
        return otp.issue(account.email(),session.getId());
    }
    @PostMapping("/verify") @ResponseStatus(HttpStatus.NO_CONTENT)
    void verify(@Valid @RequestBody Verification input,HttpServletRequest request) {
        var account=staff();
        var session=request.getSession(false);
        if (session==null || !otp.verify(account.email(),session.getId(),input.code()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"The code is invalid or expired. Request a new code after five unsuccessful attempts.");
        policy.markVerified(request,account);
    }
}
