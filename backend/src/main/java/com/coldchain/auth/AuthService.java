package com.coldchain.auth;

import com.coldchain.api.ApiModels.AuthResponse;
import com.coldchain.api.ApiModels.BootstrapRequest;
import com.coldchain.api.ApiModels.LoginRequest;
import com.coldchain.security.JwtService;
import com.coldchain.security.PasswordPolicy;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private record UserAccount(String email, String displayName, String passwordHash, String role, int enabled) {}

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse login(LoginRequest request) {
        if (!PasswordPolicy.isBcryptCompatible(request.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        String email = normalize(request.email());
        var users = jdbc.query(
                "SELECT email, display_name, password_hash, role_name, enabled FROM app_users WHERE email = ?",
                (rs, row) -> new UserAccount(
                        rs.getString("email"),
                        rs.getString("display_name"),
                        rs.getString("password_hash"),
                        rs.getString("role_name"),
                        rs.getInt("enabled")),
                email);
        if (users.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        UserAccount user = users.getFirst();
        if (user.enabled() != 1 || !passwordEncoder.matches(request.password(), user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return response(user.email(), user.displayName(), user.role());
    }

    @Transactional
    public AuthResponse bootstrap(BootstrapRequest request) {
        if (!PasswordPolicy.isBcryptCompatible(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password exceeds the supported UTF-8 byte limit");
        }
        jdbc.queryForObject("SELECT guard_id FROM bootstrap_guard WHERE guard_id = 1 FOR UPDATE", Integer.class);
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM app_users", Integer.class);
        if (count == null || count > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Initial administrator has already been created");
        }
        String email = normalize(request.email());
        jdbc.update(
                "INSERT INTO app_users (email, display_name, password_hash, role_name, enabled) VALUES (?, ?, ?, 'ADMIN', 1)",
                email,
                request.displayName().trim(),
                passwordEncoder.encode(request.password()));
        return response(email, request.displayName().trim(), "ADMIN");
    }

    private AuthResponse response(String email, String displayName, String role) {
        return new AuthResponse(jwtService.issue(email, role), email, displayName, role);
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
