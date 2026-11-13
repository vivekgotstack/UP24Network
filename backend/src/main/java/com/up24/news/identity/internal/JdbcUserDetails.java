package com.up24.news.identity.internal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import java.util.Locale;

/** Spring Security adapter; credentials never cross the identity API. */
@Service
class JdbcUserDetails implements UserDetailsService, UserDetailsPasswordService {
    private final JdbcTemplate jdbc;
    JdbcUserDetails(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public UserDetails loadUserByUsername(String username) {
        return jdbc.query("SELECT email,password_hash,role FROM identity_account WHERE email=?",
                (row, index) -> User.withUsername(row.getString("email"))
                        .password(row.getString("password_hash")).roles(row.getString("role")).build(),
                username.trim().toLowerCase(Locale.ROOT)).stream().findFirst()
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }

    @Override public UserDetails updatePassword(UserDetails user, String encodedPassword) {
        jdbc.update("UPDATE identity_account SET password_hash=? WHERE email=? AND password_hash=?",
                encodedPassword, user.getUsername(), user.getPassword());
        return loadUserByUsername(user.getUsername());
    }
}
