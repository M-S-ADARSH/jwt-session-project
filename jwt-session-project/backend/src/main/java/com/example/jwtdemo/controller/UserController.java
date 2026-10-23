package com.example.jwtdemo.controller;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
public class UserController {
    @GetMapping("/me")
    public Map<String, String> currentUser(Authentication authentication) {
        String role = authentication.getAuthorities().stream()
            .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")) ? "ADMIN" : "USER";
        return Map.of("username", authentication.getName(), "role", role,
            "message", "You accessed a protected endpoint successfully.");
    }
}
