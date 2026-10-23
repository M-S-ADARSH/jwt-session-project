package com.example.jwtdemo.controller;

import com.example.jwtdemo.dto.AuthResponse;
import com.example.jwtdemo.dto.LoginRequest;
import com.example.jwtdemo.dto.MessageResponse;
import com.example.jwtdemo.dto.RegisterRequest;
import com.example.jwtdemo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) { this.authService = authService; }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        try {
            return authService.login(request.username(), request.password());
        } catch (BadCredentialsException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
    }

    @PostMapping("/logout")
    public MessageResponse logout() {
        // A stateless JWT is not invalidated server-side here; the client must discard it.
        return new MessageResponse("Logged out on this client. Discard the token.");
    }
}
