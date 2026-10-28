# Cold-Chain Alerting

A full-stack starter application for monitoring refrigerated trucks. The Angular
frontend talks to a Java 21 / Spring Boot API, which stores users, configuration,
and sensor readings in Oracle Database using the PL/SQL package in
`database/install.sql`.

## What is included

- Fleet dashboard with fleet-wide metrics, temperature trends, and sustained
  temperature-excursion episodes.
- Login, one-time first-admin setup, and role-based access (`ADMIN` and
  `OPERATOR`).
- Configuration page for the temperature threshold, minimum alert duration,
  and maximum reading gap that can be bridged in an episode.
- Admin page for user provisioning and importing sensor-reading JSON files.
- The supplied sample readings at `data/sensor_readings.json`.

## Requirements

- Node.js 22.22.3+ and npm.
- JDK 21 and Maven 3.9+.
- Oracle Database 19c or newer, with a schema/user for the application.

## Start the application

1. Create an Oracle schema, then run `database/install.sql` while connected as
   that schema. It creates the tables, initial alert configuration, bootstrap
   lock row, and `COLD_CHAIN_STORE` package.
2. Set the database connection in `backend/src/main/resources/application.yml`
   or override it with `ORACLE_URL`, `ORACLE_USERNAME`, and `ORACLE_PASSWORD`.
   The defaults expect a local Oracle service named `FREEPDB1`.
   Set `JWT_SECRET` to a private random value of at least 32 bytes before
   deployment; the checked-in fallback is for local development only.
3. Start the API:

   ```powershell
   cd backend
   mvn spring-boot:run
   ```

4. Start the Angular application in a second terminal:

   ```powershell
   cd frontend
   npm install
   npm start
   ```

5. Open `http://localhost:4200`. Choose **Create first admin** on the login
   page. This endpoint is enabled only while the user table is empty. Sign in
   with the newly created credentials.
6. On the Admin page, import `data/sensor_readings.json` to populate the
   dashboard. Re-imports are safe: duplicate truck/timestamp readings are
   ignored.

The API listens on `http://localhost:8080` by default. For local frontend
development, `frontend/proxy.conf.json` forwards `/api` requests to
`http://localhost:8081` so the Angular server does not collide with other
services on port 8080. Change the proxy target to your chosen `SERVER_PORT`.
Configure `APP_CORS_ORIGINS` if the frontend is served from a different origin.

## Product and implementation guidelines

### Login and access

- Require email and password; normalize email addresses before lookup.
- Store only BCrypt password hashes. Never return hashes, JWTs, or secrets in
  user-list responses or logs.
- Require at least 12 password characters and respect BCrypt's 72-byte UTF-8
  input limit.
- Bootstrap exactly one initial administrator, only when no users exist;
  serialize concurrent bootstrap attempts in the database.
- Issue short-lived signed bearer tokens after successful authentication.
- Protect configuration and user-management endpoints with the `ADMIN` role.
  Authenticated operators may view the dashboard but cannot import readings or
  change settings.
- Show actionable login errors without revealing whether an email address is
  registered. Keep the token in browser session storage and clear it on logout.

### Configuration

- Validate the temperature threshold (−40 to 40 °C), minimum sustained duration
  (0 to 1440 minutes), and maximum gap (1 to 1440 minutes) on both client and
  server.
- Persist a complete configuration update atomically and show the saved values
  only after the API confirms success.
- A reading is over threshold only when its temperature is strictly greater
  than the configured threshold.
- Group readings independently by truck after sorting by timestamp. A gap
  larger than the configured maximum starts a new episode; do not infer missing
  readings or use a fixed sample cadence to calculate duration.
- An episode qualifies when its actual first-to-last timestamp duration meets
  the configured minimum.

### Administration and data quality

- Only administrators may list or create accounts, change roles, enable or
  disable users, or import readings.
- Validate imported truck IDs, ISO timestamps, finite temperatures, and
  humidity percentages; report rejected rows rather than silently accepting
  malformed data.
- Interpret ISO timestamps without an explicit UTC offset as UTC; preserve
  supplied offsets when they are present.
- Enforce uniqueness for `(truck_id, reading_time)` in Oracle. Treat duplicate
  imports as idempotent and report inserted/duplicate totals.
- Use parameterized SQL, least-privilege database credentials, and server-side
  authorization; hiding a page or button is not a security boundary.

## Project layout

```text
backend/      Spring Boot REST API
database/     Oracle DDL and PL/SQL package
frontend/     Angular application
data/         Synthetic sensor readings for import
```
# hcl-fde2
