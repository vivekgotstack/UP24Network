package com.up24.news.identity.internal;

import java.util.Optional;

/** Credentials are private to the authentication adapter. */
interface CredentialRepository {
    record Credential(String email, String encodedPassword, String role,boolean enabled) {
        @Override public String toString() { return "Credential[redacted]"; }
    }
    Optional<Credential> findCredential(String email);
    void upgradePassword(String email, String previousHash, String replacementHash);
}
