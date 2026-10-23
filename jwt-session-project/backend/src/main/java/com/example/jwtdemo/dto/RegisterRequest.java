package com.example.jwtdemo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Use letters, numbers, dots, underscores, or hyphens only") String username,
    @NotBlank @Size(min = 8, max = 72, message = "Password must contain 8 to 72 characters") String password
) { }
