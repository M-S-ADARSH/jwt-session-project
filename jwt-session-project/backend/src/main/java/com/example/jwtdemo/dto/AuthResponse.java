package com.example.jwtdemo.dto;

public record AuthResponse(String token, String tokenType, long expiresInSeconds, String username, String role) { }
