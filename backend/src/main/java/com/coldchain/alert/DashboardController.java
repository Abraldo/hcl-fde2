package com.coldchain.alert;

import com.coldchain.api.ApiModels.DashboardResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final AlertService alertService;

    public DashboardController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public DashboardResponse dashboard() {
        return alertService.dashboard();
    }
}
