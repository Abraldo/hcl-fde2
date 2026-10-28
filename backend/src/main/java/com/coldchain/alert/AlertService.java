package com.coldchain.alert;

import com.coldchain.api.ApiModels.AlertResponse;
import com.coldchain.api.ApiModels.ConfigResponse;
import com.coldchain.api.ApiModels.DashboardResponse;
import com.coldchain.api.ApiModels.ReadingResponse;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AlertService {
    private final JdbcTemplate jdbc;

    public AlertService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public DashboardResponse dashboard() {
        ConfigResponse config = jdbc.queryForObject(
                "SELECT temperature_threshold_c, minimum_duration_minutes, maximum_gap_minutes FROM app_config WHERE config_id = 1",
                (rs, row) -> new ConfigResponse(
                        rs.getDouble("temperature_threshold_c"),
                        rs.getInt("minimum_duration_minutes"),
                        rs.getInt("maximum_gap_minutes")));
        List<ReadingResponse> readings = new ArrayList<>(jdbc.query(
                "SELECT truck_id, reading_time, temperature_c, humidity_pct FROM sensor_readings",
                (rs, row) -> new ReadingResponse(
                        rs.getString("truck_id"),
                        rs.getObject("reading_time", OffsetDateTime.class),
                        rs.getDouble("temperature_c"),
                        rs.getDouble("humidity_pct"))));
        readings.sort(Comparator.comparing(ReadingResponse::truckId)
                .thenComparing(ReadingResponse::timestamp));

        List<AlertResponse> alerts = findEpisodes(readings, config);
        int trucks = (int) readings.stream().map(ReadingResponse::truckId).distinct().count();
        double average = readings.stream().mapToDouble(ReadingResponse::temperatureC).average().orElse(0);
        return new DashboardResponse(trucks, readings.size(), alerts.size(), average, config, readings, alerts);
    }

    private List<AlertResponse> findEpisodes(List<ReadingResponse> readings, ConfigResponse config) {
        List<AlertResponse> alerts = new ArrayList<>();
        List<ReadingResponse> episode = new ArrayList<>();
        String truck = null;
        for (ReadingResponse reading : readings) {
            boolean changedTruck = !reading.truckId().equals(truck);
            boolean gap = !episode.isEmpty()
                    && Duration.between(episode.getLast().timestamp(), reading.timestamp()).toMinutes()
                            > config.maximumGapMinutes();
            if (changedTruck || gap || reading.temperatureC() <= config.temperatureThresholdC()) {
                addIfAlertable(alerts, episode, config);
                episode.clear();
            }
            truck = reading.truckId();
            if (reading.temperatureC() > config.temperatureThresholdC()) {
                episode.add(reading);
            }
        }
        addIfAlertable(alerts, episode, config);
        return alerts;
    }

    private void addIfAlertable(List<AlertResponse> alerts, List<ReadingResponse> episode, ConfigResponse config) {
        if (episode.isEmpty()) return;
        ReadingResponse first = episode.getFirst();
        ReadingResponse last = episode.getLast();
        double duration = Duration.between(first.timestamp(), last.timestamp()).toSeconds() / 60.0;
        if (duration < config.minimumDurationMinutes()) return;
        double peak = episode.stream().mapToDouble(ReadingResponse::temperatureC).max().orElseThrow();
        alerts.add(new AlertResponse(
                first.truckId(),
                first.timestamp(),
                last.timestamp(),
                duration,
                peak,
                peak >= config.temperatureThresholdC() + 2 ? "CRITICAL" : "WARNING",
                episode.size()));
    }
}
