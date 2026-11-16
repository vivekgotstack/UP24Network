package com.up24.news.identity.internal;

import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.springframework.security.core.authority.AuthorityUtils;

@Service
class AccountUserDetails implements UserDetailsService, UserDetailsPasswordService {
    /** Retains only the account version after Spring erases password credentials. */
    static final class Principal extends User {
        private final long version;
        Principal(CredentialRepository.Credential credential) {
            super(credential.email(),credential.encodedPassword(),credential.enabled(),true,true,true,
                    AuthorityUtils.createAuthorityList("ROLE_"+credential.role()));
            version=credential.version();
        }
        long version() { return version; }
        Principal(Principal previous,String encodedPassword) {
            super(previous.getUsername(),encodedPassword,previous.isEnabled(),true,true,true,previous.getAuthorities());
            version=previous.version;
        }
    }
    private final CredentialRepository credentials;
    AccountUserDetails(CredentialRepository credentials) { this.credentials = credentials; }

    @Override public UserDetails loadUserByUsername(String username) {
        var credential = credentials.findCredential(EmailAddresses.normalize(username))
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
        return new Principal(credential);
    }
    @Override public UserDetails updatePassword(UserDetails user, String encodedPassword) {
        credentials.upgradePassword(user.getUsername(), user.getPassword(), encodedPassword);
        // Preserve the version actually authenticated. A concurrent reset must not
        // turn an old-password authentication into a new-version login.
        return new Principal((Principal)user,encodedPassword);
    }
}
