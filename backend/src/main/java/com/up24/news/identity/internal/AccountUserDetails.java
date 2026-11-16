package com.up24.news.identity.internal;

import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
class AccountUserDetails implements UserDetailsService, UserDetailsPasswordService {
    private final CredentialRepository credentials;
    AccountUserDetails(CredentialRepository credentials) { this.credentials = credentials; }

    @Override public UserDetails loadUserByUsername(String username) {
        var credential = credentials.findCredential(EmailAddresses.normalize(username))
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
        return User.withUsername(credential.email()).password(credential.encodedPassword()).roles(credential.role()).disabled(!credential.enabled()).build();
    }
    @Override public UserDetails updatePassword(UserDetails user, String encodedPassword) {
        credentials.upgradePassword(user.getUsername(), user.getPassword(), encodedPassword);
        return loadUserByUsername(user.getUsername());
    }
}
