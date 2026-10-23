package com.example.jwtdemo;

import com.example.jwtdemo.entity.AppUser;
import com.example.jwtdemo.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class JwtSessionDemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(JwtSessionDemoApplication.class, args);
    }

    // Creates predictable demo accounts once, so the live session is easy to reproduce.
    @Bean
    CommandLineRunner seedDemoUsers(UserRepository users, PasswordEncoder encoder) {
        return args -> {
            if (!users.existsByUsername("demo")) {
                users.save(new AppUser("demo", encoder.encode("DemoPass123!"), "USER"));
            }
            if (!users.existsByUsername("admin")) {
                users.save(new AppUser("admin", encoder.encode("AdminPass123!"), "ADMIN"));
            }
        };
    }
}
