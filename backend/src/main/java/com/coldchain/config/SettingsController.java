package com.coldchain.config;

import com.coldchain.api.ApiModels.ConfigRequest;
import com.coldchain.api.ApiModels.ConfigResponse;
import jakarta.validation.Valid;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/config")
public class SettingsController {
    private final JdbcTemplate jdbc;

    public SettingsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public ConfigResponse get() {
        return jdbc.queryForObject(
                "SELECT temperature_threshold_c, minimum_duration_minutes, maximum_gap_minutes FROM app_config WHERE config_id = 1",
                (rs, row) -> new ConfigResponse(
                        rs.getDouble("temperature_threshold_c"),
                        rs.getInt("minimum_duration_minutes"),
                        rs.getInt("maximum_gap_minutes")));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ConfigResponse update(@Valid @RequestBody ConfigRequest request) {
        jdbc.update(
                "BEGIN cold_chain_store.save_config(?, ?, ?); END;",
                request.temperatureThresholdC(),
                request.minimumDurationMinutes(),
                request.maximumGapMinutes());
        return get();
    }
}
