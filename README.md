# ChemU

A chemistry course platform for teachers and students. Teachers create courses with chapters, sections, and questions. Students enroll, work through content, and earn points and badges.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) (for MongoDB)

## Setup

### 1. Start MongoDB

```bash
docker compose up -d mongo mongo-setup
```

This starts a MongoDB 7 container (`chemu_mongo`) on port `27017` with a replica set (`rs0`) required by Prisma. The `mongo-setup` service initialises the replica set once and exits. Wait until the mongo container is healthy before continuing.

```bash
docker ps  # STATUS column should read "Up ... (healthy)"
```

> The `server` service in `docker-compose.yml` is for **production deployment only** — it reads from `server/.env.production`. Do not run it for local development.

### 2. Install server dependencies

```bash
cd server
npm install
```

### 3. Configure server environment variables

```bash
cp .env.example .env
```

Edit `server/.env` and set:

| Variable | Description |
|---|---|
| `PORT` | Port the API server listens on (default `3000`) |
| `DATABASE_URL` | MongoDB connection string — must use `127.0.0.1` (not `localhost`) and include `?replicaSet=rs0&directConnection=true` on Windows |
| `JWT_SECRET` | Long random string used to sign auth tokens |
| `JWT_EXPIRES_IN` | Token expiry, e.g. `15m`, `7d` |

### 4. Generate Prisma client

Run from the `server/` directory:

```bash
npx prisma generate
```

### 5. Seed the database (optional)

```bash
npm run seed          # seed with sample data
npm run seed:reset    # drop all data and re-seed
```

### 6. Start the server

**Development** (auto-restarts on file changes):
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The API will be available at `http://localhost:3000`.

### 7. Start the client

```bash
cd client
npm install
cp .env.example .env
npm start
```

Edit `client/.env` to point at your API server:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the API server (default `http://localhost:3000`) |

> **Physical device:** `localhost` won't work from a phone. Replace it with your machine's LAN IP address, e.g. `http://192.168.1.100:3000`. Keep the port the same as `PORT` in `server/.env`.

This opens the Expo dev server. From there:

- Press `a` to open on an Android emulator
- Press `i` to open on an iOS simulator
- Press `w` to open in a web browser
- Scan the QR code with the [Expo Go](https://expo.dev/go) app on your phone

## Running tests

```bash
cd server
npm test
```

Tests run in-band (sequentially) using Jest and Supertest.

## Building for distribution (EAS)

The project uses [EAS Build](https://docs.expo.dev/build/introduction/) for creating distributable binaries. The `eas.json` includes an `internal` profile that produces an Android APK for internal testing.

```bash
cd client
npx eas build --profile internal --platform android
```

## Stopping MongoDB

```bash
docker compose down
```

To also delete the persisted database volume:
```bash
docker compose down -v
```
