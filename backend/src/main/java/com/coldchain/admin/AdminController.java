package com.coldchain.admin;

import com.coldchain.api.ApiModels.ImportResponse;
import com.coldchain.api.ApiModels.ReadingImport;
import com.coldchain.api.ApiModels.ReadingImportRequest;
import com.coldchain.api.ApiModels.UserCreateRequest;
import com.coldchain.api.ApiModels.UserResponse;
import com.coldchain.api.ApiModels.UserStatusRequest;
import com.coldchain.security.PasswordPolicy;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    public AdminController(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/users")
    public List<UserResponse> users() {
        return jdbc.query(
                "SELECT user_id, email, display_name, role_name, enabled FROM app_users ORDER BY display_name",
                (rs, row) -> new UserResponse(
                        rs.getLong("user_id"),
                        rs.getString("email"),
                        rs.getString("display_name"),
                        rs.getString("role_name"),
                        rs.getInt("enabled") == 1));
    }

    @PostMapping("/users")
    @Transactional
    public UserResponse createUser(@Valid @RequestBody UserCreateRequest request) {
        if (!PasswordPolicy.isBcryptCompatible(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password exceeds the supported UTF-8 byte limit");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String role = request.role() == null ? "OPERATOR" : request.role();
        if ("ADMIN".equals(role)) {
            jdbc.queryForObject("SELECT guard_id FROM bootstrap_guard WHERE guard_id = 1 FOR UPDATE", Integer.class);
        }
        try {
            jdbc.update(
                    "INSERT INTO app_users (email, display_name, password_hash, role_name, enabled) VALUES (?, ?, ?, ?, 1)",
                    email,
                    request.displayName().trim(),
                    passwordEncoder.encode(request.password()),
                    role);
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with that email already exists");
        }
        return jdbc.queryForObject(
                "SELECT user_id, email, display_name, role_name, enabled FROM app_users WHERE email = ?",
                (rs, row) -> new UserResponse(
                        rs.getLong("user_id"),
                        rs.getString("email"),
                        rs.getString("display_name"),
                        rs.getString("role_name"),
                        rs.getInt("enabled") == 1),
                email);
    }

    @PutMapping("/users/{id}/status")
    @Transactional
    public UserResponse setUserStatus(
            @PathVariable long id,
            @Valid @RequestBody UserStatusRequest request,
            @AuthenticationPrincipal String actorEmail) {
        jdbc.queryForObject("SELECT guard_id FROM bootstrap_guard WHERE guard_id = 1 FOR UPDATE", Integer.class);
        var target = jdbc.query(
                "SELECT email, role_name, enabled FROM app_users WHERE user_id = ?",
                (rs, row) -> new Object[] {rs.getString("email"), rs.getString("role_name"), rs.getInt("enabled")},
                id);
        if (target.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        Object[] targetUser = target.getFirst();
        int enabled = Boolean.TRUE.equals(request.enabled()) ? 1 : 0;
        if (enabled == 0 && actorEmail.equalsIgnoreCase((String) targetUser[0])) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot disable your own account");
        }
        if (enabled == 0 && "ADMIN".equals(targetUser[1]) && (int) targetUser[2] == 1) {
            Integer activeAdmins = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM app_users WHERE role_name = 'ADMIN' AND enabled = 1", Integer.class);
            if (activeAdmins != null && activeAdmins <= 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The last enabled administrator cannot be disabled");
            }
        }
        int changed = jdbc.update("UPDATE app_users SET enabled = ? WHERE user_id = ?", enabled, id);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        return jdbc.queryForObject(
                "SELECT user_id, email, display_name, role_name, enabled FROM app_users WHERE user_id = ?",
                (rs, row) -> new UserResponse(
                        rs.getLong("user_id"),
                        rs.getString("email"),
                        rs.getString("display_name"),
                        rs.getString("role_name"),
                        rs.getInt("enabled") == 1),
                id);
    }

    @PostMapping("/readings/import")
    @Transactional
    public ImportResponse importReadings(@Valid @RequestBody ReadingImportRequest request) {
        int inserted = 0;
        int duplicates = 0;
        for (ReadingImport reading : request.readings()) {
            if (!Double.isFinite(reading.temperature_c()) || !Double.isFinite(reading.humidity_pct())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Temperatures and humidity must be finite numbers");
            }
            OffsetDateTime timestamp;
            try {
                timestamp = OffsetDateTime.parse(reading.timestamp());
            } catch (DateTimeParseException ignored) {
                try {
                    timestamp = LocalDateTime.parse(reading.timestamp()).atOffset(java.time.ZoneOffset.UTC);
                } catch (DateTimeParseException exception) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reading timestamps must be ISO-8601 date-times");
                }
            }
            try {
                jdbc.update(
                        "BEGIN cold_chain_store.add_reading(?, ?, ?, ?); END;",
                        reading.truck_id().trim(),
                        timestamp,
                        reading.temperature_c(),
                        reading.humidity_pct());
                inserted++;
            } catch (DuplicateKeyException exception) {
                duplicates++;
            }
        }
        return new ImportResponse(inserted, duplicates);
    }
}
