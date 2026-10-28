package com.coldchain.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;

public final class ApiModels {
    private ApiModels() {}

    public record LoginRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 72) String password) {}

    public record BootstrapRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 120) String displayName,
            @NotBlank @Size(min = 12, max = 72) String password) {}

    public record UserCreateRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 120) String displayName,
            @NotBlank @Size(min = 12, max = 72) String password,
            @Pattern(regexp = "ADMIN|OPERATOR") String role) {}

    public record AuthResponse(String token, String email, String displayName, String role) {}
    public record UserResponse(long id, String email, String displayName, String role, boolean enabled) {}
    public record UserStatusRequest(@NotNull Boolean enabled) {}

    public record ConfigRequest(
            @NotNull @Min(-40) @Max(40) Double temperatureThresholdC,
            @NotNull @Min(0) @Max(1440) Integer minimumDurationMinutes,
            @NotNull @Min(1) @Max(1440) Integer maximumGapMinutes) {}

    public record ConfigResponse(
            double temperatureThresholdC,
            int minimumDurationMinutes,
            int maximumGapMinutes) {}

    public record ReadingImport(
            @NotBlank @Size(max = 40) String truck_id,
            @NotBlank @Size(max = 40) String timestamp,
            @NotNull Double temperature_c,
            @NotNull @Min(0) @Max(100) Double humidity_pct) {}

    public record ReadingImportRequest(@NotEmpty @Size(max = 10000) List<@Valid ReadingImport> readings) {}
    public record ImportResponse(int inserted, int duplicates) {}
    public record ReadingResponse(String truckId, OffsetDateTime timestamp, double temperatureC, double humidityPct) {}
    public record AlertResponse(
            String truckId,
            OffsetDateTime startedAt,
            OffsetDateTime endedAt,
            double durationMinutes,
            double peakTemperatureC,
            String severity,
            int readingCount) {}
    public record DashboardResponse(
            int truckCount,
            int readingCount,
            int alertCount,
            double fleetAverageTemperatureC,
            ConfigResponse config,
            List<ReadingResponse> readings,
            List<AlertResponse> alerts) {}
}
