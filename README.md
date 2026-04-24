# Chem App

A chemistry course platform for teachers and students. Teachers create courses with chapters, sections, and questions. Students enroll, work through content, and earn points and badges.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) (for MongoDB)

## Setup

### 1. Start MongoDB

```bash
docker compose up -d
```

This starts a MongoDB 7 container (`chem_app_mongo`) on port `27017` with a replica set (`rs0`) required by Prisma. The container auto-initialises the replica set via its healthcheck — wait until the status shows `healthy` before continuing.

```bash
docker ps  # STATUS column should read "Up ... (healthy)"
```

### 2. Install dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `server/.env` and set:

| Variable | Description |
|---|---|
| `PORT` | Port the API server listens on (default `3000`) |
| `DATABASE_URL` | MongoDB connection string — keep `?directConnection=true` for the local replica set |
| `JWT_SECRET` | Long random string used to sign auth tokens |
| `JWT_EXPIRES_IN` | Token expiry, e.g. `15m`, `7d` |

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Start the server

**Development** (auto-restarts on file changes):
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The API will be available at `http://localhost:3000`.

### 6. Start the client

```bash
cd client
npm install
cp .env.example .env
npm start
```

Edit `client/.env` if your server runs on a different port:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the API server (default `http://localhost:3000`) |

This opens the Expo dev server. From there:

- Press `a` to open on an Android emulator
- Press `w` to open in a web browser
- Scan the QR code with the [Expo Go](https://expo.dev/go) app on your phone

## Running tests

```bash
cd server
npm test
```

Tests run in-band (sequentially) using Jest and Supertest.

## Stopping MongoDB

```bash
docker compose down
```

To also delete the persisted database volume:
```bash
docker compose down -v
```
