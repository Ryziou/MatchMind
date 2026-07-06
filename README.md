# MatchMind

## Project Overview

MatchMind is an AI resume and job intelligence platform. The goal is to let users upload a CV, paste a job description, and receive a structured analysis of how well their experience matches the role, powered by a real Retrieval-Augmented Generation (RAG) pipeline.

The project is under active development. Milestone 0 establishes the monorepo, Docker environment, and core service wiring. CV upload, RAG analysis, and chat are planned for upcoming milestones.

## Features

Current (Milestone 0):

- Monorepo with separate `client`, `server`, and shared packages
- Docker Compose stack (client, server, ChromaDB)
- Dashboard placeholder with live server and ChromaDB status
- Health check API at `/api/health`
- Dark and light theme toggle
- Typed environment configuration and Gemini provider skeleton
- Dev Container with Node 20, Docker-in-Docker, and preconfigured editor extensions

Planned:

- CV upload (PDF/DOCX) with semantic chunking and embedding
- Job description analysis via Top-K retrieval (not full CV passthrough)
- Structured match scores, strengths, gaps, and interview questions
- Post-analysis chat using the existing vector store

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React, TypeScript, Vite, PrimeReact, React Router |
| Backend | Node.js, Express, TypeScript |
| AI | Google Gemini (`@google/generative-ai`) |
| Vector DB | ChromaDB |
| Shared contracts | Zod |
| Tooling | ESLint, Prettier, Docker Compose, Dev Containers |

## Architecture / Project Structure

```
MatchMind/
├── client/            React frontend
├── server/            Express API
├── packages/shared/   Zod schemas and shared types
├── docker/            Dockerfiles and nginx config
└── .devcontainer/     Dev Container config (Node 20 + Docker-in-Docker)
```

The client talks to the server over REST. The server connects to ChromaDB for vector storage (wired in Milestone 0, used from Milestone 1 onward). Shared Zod schemas in `packages/shared` keep API contracts consistent between frontend and backend.

## Running Locally

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (required to launch the Dev Container or run Compose)
- Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

For native local development without a Dev Container, you also need Node.js 20+ installed on the host.

### Environment variables

Copy the example file and set your API key:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `CHROMA_HOST` | No | ChromaDB host (default: `chroma` in Docker, `localhost` locally) |
| `CHROMA_PORT` | No | ChromaDB port (default: `8000`) |
| `PORT` | No | Server port (default: `3001`) |

### Option A: Dev Container (recommended)

The Dev Container includes Node 20, npm, Docker CLI, and Docker Compose via Docker-in-Docker. Once inside, `docker compose` works without relying on WSL Docker integration.

**Requirements:** Docker Desktop must be running on Windows.

**Important:** Open the `MatchMind` folder itself as your workspace, not the parent `code/` folder. The config lives at `MatchMind/.devcontainer/devcontainer.json` and Cursor only detects it when `MatchMind` is the root folder you opened.

**Cursor extension:** Install **Dev Containers** by Anysphere (`anysphere.remote-containers`). Do not use the Microsoft Remote Containers extension; it is incompatible with Cursor. After installing, reload Cursor.

1. Open the `MatchMind` folder in Cursor (`File → Open Folder → .../MatchMind`).
2. When prompted, click **Reopen in Container**. If no prompt appears, open the command palette (`Ctrl+Shift+P`) and search for **Reopen in Container**.
3. Alternatively, click the **Remote** icon in the bottom-left corner and choose **Reopen in Container**.
4. Wait for the container to build and `post-create` to finish (`npm install`, shared package build).
5. Add your `GEMINI_API_KEY` to `.env` if you have not already.
6. Inside the container terminal:

```bash
docker compose up --build
```

- Client: [http://localhost:8080](http://localhost:8080)
- Server health: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- ChromaDB: [http://localhost:8000](http://localhost:8000)

For day-to-day development inside the container:

```bash
docker compose up chroma -d
npm run dev --workspace=@matchmind/server   # terminal 1
npm run dev --workspace=@matchmind/client   # terminal 2
```

**If the Dev Container fails to start from WSL** with "docker could not be found", Docker Desktop WSL integration is not enabled for your distro. Either enable it under **Docker Desktop → Settings → Resources → WSL Integration → Ubuntu**, or open the project from Windows Cursor (not WSL remote) so Docker Desktop is used directly.

### Option B: Docker Compose on the host (full stack)

```bash
docker compose up --build
```

- Client: [http://localhost:8080](http://localhost:8080)
- Server health: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- ChromaDB: [http://localhost:8000](http://localhost:8000)

### Option C: Local development on the host

```bash
npm install
npm run build --workspace=@matchmind/shared
docker compose up chroma -d
```

Run the server and client in separate terminals:

```bash
npm run dev --workspace=@matchmind/server
npm run dev --workspace=@matchmind/client
```

Open [http://localhost:5173](http://localhost:5173). The dashboard shows whether the server and ChromaDB are reachable.

## Scripts / Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace dependencies |
| `npm run dev --workspace=@matchmind/server` | Start API with hot reload |
| `npm run dev --workspace=@matchmind/client` | Start Vite dev server |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Format code with Prettier |
| `docker compose up --build` | Run full stack in Docker |
| `docker compose up chroma -d` | Start ChromaDB only |

## Git: what to commit

**Commit these** (safe, shared project config):

- `.devcontainer/` (Dev Container setup; no secrets)
- `.vscode/extensions.json` (recommended extensions for the team)
- Source code, `docker-compose.yml`, `.env.example`, etc.

**Do not commit** (already in `.gitignore`):

- `.env` (contains your `GEMINI_API_KEY`)
- `node_modules/`, `dist/`, build output, upload caches

`.devcontainer` is meant to be pushed. It lets you (and anyone reviewing the repo) reopen the same environment on another machine. It contains no API keys, only tooling config.
