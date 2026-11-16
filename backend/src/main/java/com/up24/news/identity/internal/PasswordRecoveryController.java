package com.up24.news.identity.internal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/password")
class PasswordRecoveryController {
    record RequestCode(@NotBlank @Email @Size(max=254) String email) {}
    record Reset(@NotBlank @Email @Size(max=254) String email,@NotNull @Pattern(regexp="[0-9]{6}") String code,
                 @NotBlank @Size(min=12,max=64) String password) {
        @Override public String toString() { return "Reset[redacted]"; }
    }
    private final PasswordRecoveryService recovery;
    PasswordRecoveryController(PasswordRecoveryService recovery) { this.recovery=recovery; }
    @PostMapping("/request") @ResponseStatus(HttpStatus.ACCEPTED)
    Map<String,String> request(@Valid @RequestBody RequestCode input,HttpServletRequest request) {
        recovery.request(input.email(),request.getRemoteAddr());
        return Map.of("message","If this account supports email recovery, a reset code will arrive shortly.");
    }
    @PostMapping("/reset") @ResponseStatus(HttpStatus.NO_CONTENT)
    void reset(@Valid @RequestBody Reset input,HttpServletRequest request) {
        if(input.password().getBytes(StandardCharsets.UTF_8).length>72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The password must be at most 72 UTF-8 bytes.");
        recovery.throttleCompletion(request.getRemoteAddr());
        if(!recovery.complete(input.email(),input.code(),input.password()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The code is invalid or expired. Request a new code and try again.");
    }
}
