package com.coldchain.alert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;

import com.coldchain.api.ApiModels.ConfigResponse;
import com.coldchain.api.ApiModels.ReadingResponse;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class AlertServiceTest {
    private static final String CONFIG_SQL =
            "SELECT temperature_threshold_c, minimum_duration_minutes, maximum_gap_minutes FROM app_config WHERE config_id = 1";
    private static final String READINGS_SQL =
            "SELECT truck_id, reading_time, temperature_c, humidity_pct FROM sensor_readings";

    @Test
    void sortsReadingsAndSplitsEpisodesWhenTheActualGapExceedsTheLimit() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ConfigResponse config = new ConfigResponse(8, 20, 10);
        List<ReadingResponse> readings = List.of(
                reading("T-01", "2026-07-20T08:15:00Z", 9),
                reading("T-02", "2026-07-20T08:20:00Z", 10),
                reading("T-01", "2026-07-20T08:30:00Z", 10),
                reading("T-02", "2026-07-20T08:00:00Z", 9),
                reading("T-01", "2026-07-20T08:00:00Z", 9),
                reading("T-01", "2026-07-20T08:10:00Z", 9.5),
                reading("T-02", "2026-07-20T08:10:00Z", 8.5),
                reading("T-01", "2026-07-20T08:35:00Z", 9.5));
        doReturn(config).when(jdbc).queryForObject(eq(CONFIG_SQL), any(RowMapper.class));
        doReturn(readings).when(jdbc).query(eq(READINGS_SQL), any(RowMapper.class));

        var result = new AlertService(jdbc).dashboard();

        assertEquals(2, result.truckCount());
        assertEquals(8, result.readingCount());
        assertEquals(1, result.alertCount());
        assertEquals("T-02", result.alerts().getFirst().truckId());
        assertEquals(20, result.alerts().getFirst().durationMinutes());
        assertEquals(3, result.alerts().getFirst().readingCount());
        assertEquals("CRITICAL", result.alerts().getFirst().severity());
    }

    @Test
    void doesNotAlertOnAnEpisodeShorterThanTheConfiguredDuration() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        doReturn(new ConfigResponse(8, 20, 10))
                .when(jdbc).queryForObject(eq(CONFIG_SQL), any(RowMapper.class));
        doReturn(List.of(
                        reading("T-01", "2026-07-20T08:00:00Z", 9),
                        reading("T-01", "2026-07-20T08:05:00Z", 9.5),
                        reading("T-01", "2026-07-20T08:10:00Z", 7)))
                .when(jdbc).query(eq(READINGS_SQL), any(RowMapper.class));

        var result = new AlertService(jdbc).dashboard();

        assertEquals(0, result.alertCount());
    }

    private ReadingResponse reading(String truckId, String timestamp, double temperature) {
        return new ReadingResponse(truckId, OffsetDateTime.parse(timestamp), temperature, 55);
    }
}
