package com.coldchain.auth;

import com.coldchain.api.ApiModels.AuthResponse;
import com.coldchain.api.ApiModels.BootstrapRequest;
import com.coldchain.api.ApiModels.LoginRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/bootstrap")
    public AuthResponse bootstrap(@Valid @RequestBody BootstrapRequest request) {
        return authService.bootstrap(request);
    }
}
