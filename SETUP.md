# ChemU — Deployment & Setup Guide

> For developers taking over this project. Covers the AWS server/database stack, the React Native client build pipeline, and the GitHub Actions CI/CD workflow.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server & Database (AWS EC2)](#server--database-aws-ec2)
3. [Client (React Native / Expo)](#client-react-native--expo)
4. [CI/CD Pipeline (GitHub Actions)](#cicd-pipeline-github-actions)
5. [Environment Variables Reference](#environment-variables-reference)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v20+ | Server runtime |
| Docker + Docker Compose | Latest | MongoDB + server containers |
| Git | Any | Source control |
| Expo CLI | Latest | React Native development |
| EAS CLI | v10+ | Mobile app builds |
| An AWS account | — | EC2 hosting |

---

## Server & Database (AWS EC2)

The backend is a Node.js/Express API backed by MongoDB. Both run in Docker containers on a single EC2 instance, managed by Docker Compose.

### 1. Provision the EC2 Instance

1. Launch an EC2 instance in the AWS Console:
   - **AMI**: Ubuntu 24.04 LTS
   - **Instance type**: `t3.small` or larger (MongoDB replica set needs at least 1 GB RAM)
   - **Storage**: 20 GB gp3 minimum
   - **Security group inbound rules**:
     | Port | Protocol | Source | Purpose |
     |------|----------|--------|---------|
     | 22 | TCP | Your IP / GitHub Actions IP range | SSH |
     | 3000 | TCP | 0.0.0.0/0 | API (or restrict to known IPs) |

2. Note the **public IPv4 address** — you will need it for `EC2_HOST` in GitHub Secrets and in the client `.env`.

### 2. Configure the EC2 Instance

SSH into the instance and run the following one-time setup:

```bash
# Install Docker
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker ubuntu

# Log out and back in for the group change to take effect, then:
git clone https://github.com/<your-org>/Chem-App.git ~/Chem-App
```

### 3. Create the Production Environment File

The Docker Compose file reads from `server/.env.production` on the EC2 instance. This file is **not** committed to the repository — create it manually:

```bash
nano ~/Chem-App/server/.env.production
```

Paste the following and fill in real values:

```env
PORT=3000
DATABASE_URL=mongodb://mongo:27017/chemu?replicaSet=rs0&directConnection=true
JWT_SECRET=<generate a long random string — e.g. openssl rand -hex 64>
JWT_EXPIRES_IN=15m
```

> **Important:** `DATABASE_URL` uses `mongo` as the hostname (the Docker Compose service name), not `127.0.0.1`. The replica set name must match `rs0` exactly.

### 4. Start the Stack

```bash
cd ~/Chem-App
docker compose up -d
```

Docker Compose starts three services in order:

| Service | Image | Role |
|---------|-------|------|
| `mongo` | mongo:7 | MongoDB 7 with replica set enabled |
| `mongo-setup` | mongo:7 | One-shot: initialises the `rs0` replica set |
| `server` | Built from `server/Dockerfile` | Express API on port 3000 |

MongoDB data is persisted in the named volume `mongo_data` — it survives container restarts and redeploys.

### 5. Verify the Deployment

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### 6. Database Seeding (First Deploy Only)

To seed the database with initial data:

```bash
docker exec chemu_server npm run seed
```

To reset and re-seed:

```bash
docker exec chemu_server npm run seed:reset
```

### 7. MongoDB Replica Set — Important Notes

MongoDB **must** run as a replica set for Prisma to support transactions. The `mongo-setup` container handles initialisation automatically on first boot. If you ever need to manually reinitialise:

```bash
docker exec -it chemu_mongo mongosh --eval \
  "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })"
```

Do **not** install MongoDB as a native Windows service on any developer machine used for deployment testing — it will conflict with Docker's binding on port 27017.

### 8. Updating the Server After a Redeploy

The CI/CD pipeline (see below) handles this automatically. For a manual update:

```bash
cd ~/Chem-App
git fetch origin deploy && git reset --hard origin/deploy
docker compose up -d --build server
```

---

## Client (React Native / Expo)

The mobile app is built with **Expo SDK 54** and React Native 0.81. Distributable builds are produced via **EAS Build** (Expo Application Services).

### App Identifiers

| Platform | Identifier |
|----------|-----------|
| iOS Bundle ID | `com.chemu` |
| Android Package | `com.chemu` |
| EAS Project ID | `996320c1-f067-4316-a02e-2bd2c34a8b48` |

### 1. Configure the API URL

Copy the example environment file:

```bash
cd client
cp .env.example .env
```

Edit `.env` and set the API URL to your EC2 instance:

```env
EXPO_PUBLIC_API_URL=http://<your-ec2-public-ip>:3000
```

> All `EXPO_PUBLIC_` prefixed variables are bundled into the app binary. Rebuild the app after changing this value.

### 2. Local Development

```bash
cd client
npm install
npm start          # Start Expo dev server
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator (macOS only)
```

For testing on a **physical device**, ensure your machine and device are on the same LAN and use your machine's LAN IP address (not `localhost`) in `EXPO_PUBLIC_API_URL`.

### 3. Production Build (EAS)

Ensure the EAS CLI is installed and you are logged in:

```bash
npm install -g eas-cli
eas login
```

**Android APK (internal distribution):**

```bash
cd client
npx eas build --profile internal --platform android
```

This uses the `internal` profile from `client/eas.json`, which produces an APK suitable for direct installation and internal testing.

**iOS build:**

An `ios` profile is not yet configured in `eas.json`. Add it before submitting to the App Store:

```json
"production": {
  "distribution": "store",
  "ios": { "buildType": "release" },
  "android": { "buildType": "apk" }
}
```

### 4. Submitting to App Stores

```bash
eas submit --platform android   # Submit to Google Play
eas submit --platform ios       # Submit to App Store (requires Apple developer account)
```

### 5. New Architecture

The app runs React Native's **New Architecture** (`newArchEnabled: true` in `app.json`). Ensure any third-party native modules you add support the New Architecture before installing them.

---

## CI/CD Pipeline (GitHub Actions)

The pipeline lives at `.github/workflows/deploy.yml` and runs on every push to `main` and on manual trigger.

### Pipeline Overview

```
Push to main
    │
    ▼
┌─────────────┐     FAIL → workflow stops, deploy is blocked
│  test job   │──────────────────────────────────────────────►  ✗
└─────────────┘
    │ PASS
    ▼
┌──────────────────────────────────────┐
│  deploy job                          │
│  1. Strip client/ + tests + docs     │
│  2. Force-push to `deploy` branch    │
│  3. SSH into EC2                     │
│  4. git reset --hard origin/deploy   │
│  5. docker compose up -d --build     │
└──────────────────────────────────────┘
```

### What the Pipeline Does

1. **test job** — Spins up a MongoDB 7 replica set in Docker, installs server dependencies, and runs the full Jest test suite.
2. **deploy job** (only runs if tests pass):
   - Strips the `client/`, `notes/`, `docs/`, and `.wolf/` directories so only server code ships to EC2.
   - Force-pushes a clean snapshot to the `deploy` branch.
   - SSHs into the EC2 instance and runs `docker compose up -d --build server`.

### Required GitHub Secrets

Set these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `EC2_HOST` | Public IPv4 address (or DNS) of your EC2 instance |
| `EC2_SSH_KEY` | Contents of the private SSH key (`.pem`) for the `ubuntu` user |

To generate or export the SSH key:

```bash
# If creating a new key pair:
ssh-keygen -t ed25519 -f chemu-deploy -C "chemu-deploy"
# Add chemu-deploy.pub to ~/.ssh/authorized_keys on the EC2 instance
# Paste the contents of chemu-deploy (private key) into EC2_SSH_KEY secret
```

### GitHub Environment

The deploy job runs under a GitHub **environment** named `deploy`. Create it in **GitHub → Settings → Environments** if it does not exist. You can add protection rules (e.g. require a reviewer before deploying to production).

### Manual Trigger

You can trigger a deploy without pushing code via **GitHub → Actions → Deploy → Run workflow**.

### Test Environment Variables (CI)

The test job sets these automatically — you do not need to configure them:

```
DATABASE_URL=mongodb://127.0.0.1:27017/chemu_test?replicaSet=rs0&directConnection=true
JWT_SECRET=ci-test-secret
JWT_EXPIRES_IN=15m
PORT=3000
```

---

## Environment Variables Reference

### Server (`server/.env.production` on EC2, `server/.env` for local dev)

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `PORT` | `3000` | Yes | Port the Express server listens on |
| `DATABASE_URL` | `mongodb://mongo:27017/chemu?replicaSet=rs0&directConnection=true` | Yes | Use `mongo` hostname in Docker, `127.0.0.1` locally |
| `JWT_SECRET` | `<random 64-char hex>` | Yes | Never use the placeholder in production |
| `JWT_EXPIRES_IN` | `15m` | Yes | Access token lifetime |

### Client (`client/.env`)

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `EXPO_PUBLIC_API_URL` | `http://18.225.112.81:3000` | Yes | Base URL of the deployed server; rebuilt into the app binary |

---

## Quick-Reference Checklist

**First deploy:**

- [ ] EC2 instance provisioned with correct security group rules
- [ ] Docker installed on EC2
- [ ] Repo cloned to `~/Chem-App` on EC2
- [ ] `server/.env.production` created on EC2 with real secrets
- [ ] `docker compose up -d` run on EC2
- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] DB seeded with `npm run seed`
- [ ] `EC2_HOST` and `EC2_SSH_KEY` secrets added to GitHub
- [ ] GitHub `deploy` environment created
- [ ] `EXPO_PUBLIC_API_URL` updated in `client/.env` and app rebuilt

**Each subsequent deploy:**

- Merge to `main` → CI runs tests → auto-deploys to EC2 on pass.
