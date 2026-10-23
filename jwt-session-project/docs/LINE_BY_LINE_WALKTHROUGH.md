# Code Walkthrough: JWT Secure Student Portal

This walkthrough explains the purpose of every statement group in the project, with emphasis on the lines that matter during a live teaching session. Braces and imports are explained alongside the class or method they belong to rather than repeating the same explanation for every punctuation mark.

## 1. `JwtSessionDemoApplication.java`

- `package ...` places the class in the application's root package. Spring Boot component scanning starts here and finds controllers, services, repositories, and configuration below it.
- `@SpringBootApplication` combines configuration, auto-configuration, and component scanning.
- `main` is the JVM entry point. `SpringApplication.run` starts Spring, creates beans, configures the embedded server, and initializes the application context.
- `@Bean CommandLineRunner` registers code that runs after the application starts. It is used only to seed repeatable demo accounts.
- `existsByUsername` avoids inserting the same account every time the application restarts.
- `encoder.encode(...)` creates a BCrypt hash. The original password is never written to the database.
- The `USER` and `ADMIN` role values are stored as role names. Spring Security later maps these to `ROLE_USER` and `ROLE_ADMIN` authorities.

## 2. `AppUser.java` and `UserRepository.java`

- `@Entity` tells JPA that the class maps to a database table.
- `@Table` names the table and defines a unique constraint so two accounts cannot share a username.
- `@Id` marks the primary key. `@GeneratedValue(IDENTITY)` lets MySQL generate it.
- `@Column(nullable = false)` prevents missing required values; the `password_hash` column stores only the encoded password.
- The protected no-argument constructor is available to JPA. The public constructor is used when creating a user in application code.
- Getters expose the fields needed by the service without adding public setters for credentials.
- `JpaRepository<AppUser, Long>` supplies CRUD operations. Spring Data derives `findByUsername` and `existsByUsername` queries from their method names.

## 3. Request and response DTOs

- A DTO is a Data Transfer Object: a small type describing the JSON shape accepted or returned by an API.
- `RegisterRequest` uses `@NotBlank`, `@Size`, and `@Pattern` to validate username and password input before the service handles it.
- The password limit of 72 characters is aligned with BCrypt's practical input limit in common implementations.
- `LoginRequest` requires both fields to be nonblank.
- `AuthResponse` returns the token, token type, expiry duration, username, and role. It deliberately does not return the password hash.
- `MessageResponse` is a small standard response for a message.
- Java `record` types provide compact immutable data carriers with generated accessors.

## 4. `CustomUserDetailsService.java`

- Spring Security's `UserDetailsService` is the bridge between the user database and Spring's authentication system.
- Constructor injection provides `UserRepository` to the service.
- `loadUserByUsername` looks up the account and throws `UsernameNotFoundException` if none exists.
- `User.withUsername(...)` builds Spring Security's `UserDetails` representation.
- `.password(...)` supplies the saved BCrypt hash, not the original password.
- `.roles(account.getRole())` adds the `ROLE_` prefix automatically. Therefore role `ADMIN` becomes authority `ROLE_ADMIN`.
- The same principal model is used both for credential authentication and for authorization after a token is validated.

## 5. `JwtService.java`

- `@Service` makes this class a Spring-managed component.
- `@Value` injects the signing secret and expiration from configuration/environment variables.
- `Decoders.BASE64.decode` converts the configured Base64 string to bytes. `Keys.hmacShaKeyFor` creates a cryptographic key and rejects keys that are too short for the selected HMAC algorithm.
- `generateToken` captures the current time in `now`.
- `subject(...)` stores the principal username as the JWT subject (`sub`).
- `claim("roles", ...)` adds authorities as a claim for inspection and downstream uses. Authorization in this demo still uses authorities loaded from the current user record after validating the token.
- `issuedAt` records when the token was created. `expiration` sets the expiry instant.
- `signWith` signs the token. This protects integrity; it does not encrypt the claims.
- `compact()` serializes the JWT into its three dot-separated sections.
- `parseSignedClaims` verifies the signature and parses the claims. Expired tokens or invalid signatures raise a JWT exception.
- `isTokenValid` checks that the token subject matches the loaded user and that its expiry is still in the future.
- `getExpirationSeconds` allows the API response to tell the frontend how long the token lasts.

## 6. `JwtAuthenticationFilter.java`

- `OncePerRequestFilter` is a Spring web filter designed to run once per request within a request dispatch.
- Constructor injection supplies the JWT service and the user-details service.
- `doFilterInternal` receives the request, response, and next filter in the chain.
- `request.getHeader(Authorization)` reads the standard authorization header.
- If the header is missing or does not begin with `Bearer `, the filter does not authenticate the request; it continues. Spring Security later decides whether that endpoint permits anonymous access.
- `substring(7)` removes the literal `Bearer ` prefix, leaving the token.
- `extractUsername` verifies/parses the token before trusting its subject.
- The filter avoids overwriting an authentication that already exists in the security context.
- `loadUserByUsername` fetches current user data and roles from the database. This means access can reflect the current stored role rather than blindly trusting a role claim supplied by the browser.
- `isTokenValid` checks subject and expiration.
- `UsernamePasswordAuthenticationToken(user, null, authorities)` creates an authenticated Spring Security principal. The password is `null` because the request is already authenticated by the validated token.
- `setDetails` attaches request metadata; `SecurityContextHolder` stores the authentication for downstream authorization checks.
- JWT parsing failures clear the context. The filter then continues; protected routes are rejected by the configured entry point.

## 7. `SecurityConfig.java`

- `@Configuration` declares bean definitions.
- `@EnableWebSecurity` activates Spring Security web configuration.
- `@EnableMethodSecurity` enables annotations such as `@PreAuthorize`.
- `PasswordEncoder` returns `BCryptPasswordEncoder`, which hashes new passwords and checks login passwords against stored hashes.
- `DaoAuthenticationProvider` uses `UserDetailsService` to retrieve the user and `PasswordEncoder` to compare credentials.
- `AuthenticationManager` delegates to the configured authentication providers when the login service asks Spring Security to authenticate credentials.
- `SecurityFilterChain` defines request security behavior.
- CSRF is disabled for this demonstration because the browser sends a bearer token in an explicit Authorization header and does not use cookie-based authentication. Do not copy this decision blindly if you switch to cookies.
- `SessionCreationPolicy.STATELESS` means Spring Security does not create an HTTP session to persist authentication between requests. The client sends the bearer token on each protected request.
- The authentication entry point returns HTTP 401 when a protected resource has no valid authentication.
- The access-denied handler returns HTTP 403 when the caller is authenticated but lacks permission.
- `permitAll` makes static files and login/register endpoints publicly reachable.
- `/api/admin/**` requires `ROLE_ADMIN`; `/api/user/**` requires authentication.
- `addFilterBefore` places the JWT filter before the username/password authentication filter so token authentication can populate the security context before authorization is checked.

## 8. `AuthService.java` and `AuthController.java`

- The controller is the HTTP boundary; the service contains the authentication business logic.
- `@RestController` serializes returned Java objects as JSON.
- `@RequestMapping("/api/auth")` gives the controller a shared URL prefix.
- `@PostMapping` maps POST requests to specific methods; `@RequestBody` reads JSON; `@Valid` runs DTO validation.
- During registration, `existsByUsername` detects duplicates. The password is hashed before a new `AppUser` is saved.
- Registration hardcodes role `USER`; public callers cannot promote themselves to admin by editing request JSON.
- After registration, a `UserDetails` principal is constructed and a token response is created.
- During login, `UsernamePasswordAuthenticationToken` carries the submitted username/password to `AuthenticationManager`.
- The authentication provider loads the stored BCrypt hash and checks the supplied password. Only successful authentication returns a principal.
- `BadCredentialsException` is translated into HTTP 401. A production system should keep login errors generic to avoid revealing which part of the credentials was wrong.
- `AuthResponse` includes the signed token and its expiry duration.
- The logout endpoint is informational only. In a stateless setup, clearing the browser token does not revoke a copied token; explain this limitation explicitly.

## 9. `UserController.java` and `AdminController.java`

- `Authentication` is injected by Spring MVC from the security context established by the JWT filter.
- `/api/user/me` returns the authenticated username, role, and a confirmation message.
- `/api/admin/dashboard` is annotated with `@PreAuthorize("hasRole('ADMIN')")`. It demonstrates method-level authorization as well as the URL rule.
- A normal authenticated user gets 403 on the admin endpoint; an admin receives 200.

## 10. Frontend `app.ts`

- `ApiResult` is a TypeScript type alias for an object whose values are unknown until inspected.
- `accessToken` holds the JWT in JavaScript memory. This makes the demo easy to inspect and avoids persistence across reloads; it is not a universal production storage recommendation.
- `byId<T>` is a generic helper that retrieves an HTML element and casts it to the expected element type. It throws early if the HTML and TypeScript disagree about an element ID.
- The following constants cache references to the username/password fields and response/token/status elements.
- `renderSession` updates the status badge, logout button state, and token inspector based on whether a token exists.
- `showResult` uses `textContent`, not `innerHTML`, to display a response as text and avoid treating API response text as markup.
- `request` creates a `Headers` object, sets JSON content type, and attaches `Authorization: Bearer ...` when requested and a token exists.
- `fetch` performs the HTTP request. The response body is read as text first so both JSON and non-JSON errors can be displayed.
- `response.ok` is false for HTTP 4xx/5xx. The helper throws after rendering the response, allowing `runSafely` to show a concise error note.
- `login` sends the entered credentials as JSON, stores the returned token in memory, updates the UI, and clears the password input.
- `register` follows the same process but calls the registration endpoint.
- `runSafely` attaches a catch handler to UI actions so failed network requests do not become unhandled promise rejections.
- Each `addEventListener` connects a button to an action. Profile/admin calls use the normal token-aware request helper; the no-token button explicitly disables token attachment to demonstrate 401.
- Logout sets the in-memory token to `null`; it does not claim server-side revocation.
- `renderSession()` runs once at startup to initialize the signed-out UI.

## 11. HTML and CSS

- `index.html` defines semantic sections, accessible labels, buttons, a status region, and a token inspector.
- The deferred script loads after HTML parsing so the element IDs exist when TypeScript's generated JavaScript executes.
- The stylesheet establishes the layout, colors, responsive two-column layout, focus indicators, and mobile stacking. Styling does not implement security; all access decisions remain on the backend.
- The token display is intentionally a teaching aid. Do not expose tokens in production interfaces, logs, analytics, or screenshots.

## 12. What to say during the demo

1. “The frontend never decides whether the user is authorized; the backend enforces that decision.”
2. “A JWT is signed, not necessarily encrypted. Anyone holding it can usually decode the header and payload.”
3. “401 means there is no valid authentication. 403 means the user is authenticated but does not have the required role.”
4. “Stateless means the server does not use an HTTP session to remember the login; the client sends the token on every protected request.”
5. “Logout here discards the local token. A production system needing immediate revocation needs an explicit strategy, such as short-lived access tokens with refresh-token rotation/revocation or a server-side denylist.”
6. “Browser token storage is a security trade-off. This demo uses memory, while HttpOnly cookies change the XSS/CSRF threat balance.”
