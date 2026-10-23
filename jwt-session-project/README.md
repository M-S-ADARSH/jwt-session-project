# JWT Secure Student Portal — Staff Session Demo

A full-stack learning project using **Java 21, Spring Boot 3.3.2, Spring Security, JJWT, MySQL, HTML, CSS, and plain TypeScript**. No React or frontend framework is used.

## What the demo teaches

- Authentication vs authorization
- JWT structure: header, payload, signature
- Password hashing with BCrypt
- Issuing and validating signed bearer tokens
- Stateless Spring Security and a `OncePerRequestFilter`
- Protected user and admin endpoints
- HTTP 401 vs 403
- Why JWT payloads are not encrypted

## Prerequisites

- JDK 21
- MySQL Server
- Maven (or use the Maven wrapper if you add one)
- Node.js/npm only if you want to rebuild TypeScript; the compiled `app.js` is included

## 1. Configure MySQL

Open MySQL Workbench or a MySQL shell and run:

```sql
CREATE DATABASE jwt_session_demo;
```

The default datasource username is `root` and the password is blank. Change the environment variables to match your installation:

**Windows PowerShell** (in the same terminal where you launch Spring Boot):

```powershell
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "your_mysql_password"
$env:JWT_SECRET = "ZGV2LXNlY3JldC1mb3ItZGVtby1vbmx5LWNoYW5nZS1tZS0zMi1ieXRlcyEh"
```

The example JWT secret is for local demonstration only. Generate a private, random Base64 secret for real deployments and never commit it.

## 2. Run the backend

```powershell
cd backend
mvn spring-boot:run
```

If `mvn` is not recognized, install Maven and add its `bin` folder to PATH, or open the project in an IDE with Maven support. Wait until Spring Boot reports that Tomcat has started on port 8080.

The JPA configuration creates/updates the `app_users` table. On first startup, two demonstration accounts are inserted if they do not already exist:

| Role | Username | Password |
|---|---|---|
| USER | `demo` | `DemoPass123!` |
| ADMIN | `admin` | `AdminPass123!` |

These credentials are intentionally public for the demo. Never use them in a real deployment. Passwords are stored as BCrypt hashes, not plaintext.

## 3. Open the frontend

Visit **http://localhost:8080/** in your browser. Do not open `index.html` using `file://`. The browser UI is served by Spring Boot and makes same-origin API calls.

To rebuild the TypeScript source after editing it:

```powershell
cd frontend
npm install
npm run build
```

The TypeScript compiler writes the generated `app.js` to `backend/src/main/resources/static/app.js`. Restart the backend if required.

## 4. Demo sequence

1. Open the portal and log in as `demo` / `DemoPass123!`.
2. Click **GET /api/user/me**. Expected: HTTP 200 and your username/role.
3. Click **GET /api/admin/dashboard** as `demo`. Expected: HTTP 403 (authenticated, but not authorized as admin).
4. Log out, then click **Try profile without token**. Expected: HTTP 401.
5. Log in as `admin` / `AdminPass123!` and click the admin endpoint. Expected: HTTP 200.
6. Register a new username with a password of at least 8 characters, then use the profile endpoint.
7. Inspect the token panel. Explain that Base64URL encoding is not encryption; the payload is readable.
8. Refresh the page. The token disappears because the demo stores it in JavaScript memory only.

## API reference

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a USER account and return a token |
| POST | `/api/auth/login` | Public | Verify credentials and return a token |
| POST | `/api/auth/logout` | Public in this demo | Informational endpoint; client discards the token |
| GET | `/api/user/me` | Authenticated | Return current username and role |
| GET | `/api/admin/dashboard` | ADMIN only | Demonstrate role authorization |

Example login request:

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{"username":"demo","password":"DemoPass123!"}
```

Example authenticated request:

```http
GET http://localhost:8080/api/user/me
Authorization: Bearer <paste-token-here>
```

## Troubleshooting

- **`Unknown database 'jwt_session_demo'`:** run `CREATE DATABASE jwt_session_demo;` and confirm `DB_URL`.
- **Access denied for MySQL:** set `DB_USERNAME` and `DB_PASSWORD` correctly.
- **`mvn` not recognized:** install Maven or run from an IDE with Maven support.
- **Port 8080 is occupied:** change `server.port` in `application.properties`.
- **401 on profile:** sign in again; the page intentionally forgets the token on refresh/logout.
- **403 on admin with `demo`:** expected behavior. Use the `admin` account.
- **Registration conflict:** choose a username that is not already in the database.

## Security notes — be precise in your presentation

1. The configured HMAC signing key must remain secret. The included fallback is only for local teaching.
2. Use HTTPS outside localhost.
3. BCrypt is a one-way password hashing function; do not store plaintext passwords.
4. A signed JWT is integrity-protected, not confidential. Do not put passwords or secrets in its claims.
5. Tokens are bearer credentials: anyone who obtains one may use it until expiry unless you add revocation controls.
6. This demo uses an Authorization header and keeps the token in page memory. This reduces persistence but does not eliminate XSS risk while the page is open. Production storage decisions require a threat model. HttpOnly Secure cookies can mitigate token theft by JavaScript but require appropriate CSRF protections.
7. CSRF is disabled here because the API uses explicit bearer headers and the demo does not authenticate with cookies. Revisit this if switching to cookies.
8. Add rate limiting, monitoring, generic login errors, account lifecycle handling, secret rotation, and tests before production use.
9. Stateless logout in this demo only discards the client token; it does not revoke a copied token server-side. Short expiry or a revocation strategy is needed when immediate invalidation matters.
10. Registration always assigns `USER` on the server. Never let a public registration form choose `ADMIN`.

## Presentation structure (25–30 minutes)

- 0–3 min: explain authentication vs authorization using a student portal analogy.
- 3–7 min: show the JWT `header.payload.signature` structure and decode a sample payload.
- 7–11 min: walk through the login request, BCrypt verification, and token issuance.
- 11–20 min: live demo login, profile endpoint, missing token (401), USER accessing admin (403), ADMIN accessing admin (200).
- 20–25 min: explain filter chain, stateless sessions, expiry, signing secret, and browser storage.
- 25–30 min: questions and recap.

## Project map

- `backend/src/main/java/.../SecurityConfig.java` — access rules, stateless security, password encoder, 401/403 handlers.
- `.../JwtAuthenticationFilter.java` — reads and validates the Bearer token for each request.
- `.../JwtService.java` — signs tokens and parses verified claims.
- `.../AuthService.java` and `AuthController.java` — registration/login API.
- `.../CustomUserDetailsService.java` — loads users and authorities from MySQL.
- `.../AppUser.java` and `UserRepository.java` — persistent account model.
- `backend/src/main/resources/static/` — frontend served by Spring Boot.
- `frontend/src/app.ts` — TypeScript source for browser interactions.
- `docs/LINE_BY_LINE_WALKTHROUGH.md` — concept-by-concept code walkthrough.
