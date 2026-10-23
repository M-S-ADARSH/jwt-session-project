package com.example.jwtdemo.service;

import com.example.jwtdemo.dto.AuthResponse;
import com.example.jwtdemo.dto.RegisterRequest;
import com.example.jwtdemo.entity.AppUser;
import com.example.jwtdemo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (users.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already registered");
        }
        AppUser account = users.save(new AppUser(
            request.username(), passwordEncoder.encode(request.password()), "USER"));
        UserDetails principal = org.springframework.security.core.userdetails.User
            .withUsername(account.getUsername()).password(account.getPasswordHash()).roles(account.getRole()).build();
        return createResponse(principal, account.getRole());
    }

    public AuthResponse login(String username, String password) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(username, password));
        UserDetails principal = (UserDetails) authentication.getPrincipal();
        String role = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")) ? "ADMIN" : "USER";
        return createResponse(principal, role);
    }

    private AuthResponse createResponse(UserDetails principal, String role) {
        return new AuthResponse(jwtService.generateToken(principal), "Bearer",
            jwtService.getExpirationSeconds(), principal.getUsername(), role);
    }
}
