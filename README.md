# MatchMind

## Project Overview

MatchMind is an AI resume and job intelligence platform. Users upload a CV, paste a job description, and receive a structured analysis of how well their experience matches the role. The analysis is powered by a real Retrieval-Augmented Generation (RAG) pipeline: the LLM never receives the full CV, only semantically retrieved chunks.

The project is under active development. **Milestone 2** is complete: Top-K retrieval against the job description, structured Gemini analysis, Zod validation with retry, and SSE progress streaming. The results UI and chat mode are planned for upcoming milestones.

## Why I Built This

I wanted to create a portfolio project that demonstrates my use of Retrieval-Augmented Generation (RAG) to gain hands-on experience with modern AI engineering, enabling users to query uploaded documents using LLMs and vector search.

## Features

**Current (Milestone 0 to 2):**

- Monorepo with `client`, `server`, and `packages/shared`
- Docker Compose stack (client, server, ChromaDB)
- Dashboard with live server and ChromaDB status, dark/light theme
- Typed environment configuration (Zod-validated)
- Gemini embeddings (`gemini-embedding-001`) and JSON generation
- CV upload via `POST /api/sessions` (PDF and DOCX, size-validated)
- Section-aware chunking with metadata (`section`, `sourceFile`, `chunkIndex`)
- Session-scoped Chroma collections (`cv_{sessionId}`)
- Job description analysis via `POST /api/sessions/:id/analyze`
- Top-K RAG retrieval using only relevant CV chunks (not the full document)
- Structured analysis output: match score, skill breakdown, strengths, gaps, CV improvements, cover letter, interview questions
- Zod validation with JSON retry logic and token usage logging
- SSE progress events (`retrieving`, `analyzing`, `complete`)
- Session delete to remove uploaded files and vector data
- Dev Container with Node 20 and Docker-in-Docker

**Planned (Milestone 3 onward):**

- Full dashboard upload flow and results UI with real progress stepper
- Post-analysis chat reusing the session vector store
- Production hardening, logging, and tests

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React, TypeScript, Vite, PrimeReact, React Router |
| Backend | Node.js, Express, TypeScript |
| AI | Google Gemini (`@google/generative-ai`) |
| Vector DB | ChromaDB |
| Document parsing | `pdf-parse`, `mammoth` |
| Shared contracts | Zod |
| Tooling | ESLint, Prettier, Docker Compose, Dev Containers |

## Architecture / Project Structure

```
MatchMind/
├── client/                 React frontend
├── server/                 Express API
│   └── src/
│       ├── ai/
│       │   ├── providers/  Gemini embedding + LLM interfaces
│       │   └── prompts/    Versioned prompt templates
│       ├── db/chroma/      Chroma client and collection helpers
│       ├── rag/
│       │   ├── chunking/   Section-aware text splitting
│       │   ├── ingestion/  PDF/DOCX parsing and ingest pipeline
│       │   └── retrieval/  Top-K semantic search
│       ├── services/       Session and analysis orchestration
│       └── routes/         HTTP route definitions
├── packages/shared/        Zod schemas and shared TypeScript types
├── docker/                 Dockerfiles and nginx config
├── scripts/                Anonymous API smoke tests (safe to commit)
└── .devcontainer/          Dev Container config
```

**Analysis flow (Milestone 2):**

1. Client uploads a CV to `POST /api/sessions` (ingestion stores chunks in Chroma)
2. Client sends a job description to `POST /api/sessions/:id/analyze`
3. Server embeds the job description and retrieves Top-K CV chunks from Chroma
4. Gemini generates structured JSON using only the job description and retrieved chunks
5. Server validates the response with Zod and streams progress over SSE

Shared Zod schemas in `packages/shared` keep API contracts consistent between frontend and backend.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Server and ChromaDB health check |
| `POST` | `/api/sessions` | Upload CV (multipart field: `cv`), ingest into Chroma |
| `POST` | `/api/sessions/:id/analyze` | Analyze CV against a job description (SSE stream) |
| `GET` | `/api/sessions/:id/debug/query?q=...` | Test semantic retrieval for a session |
| `DELETE` | `/api/sessions/:id` | Delete session uploads and Chroma collection |

Example upload:

```bash
curl -X POST http://localhost:3001/api/sessions \
  -F "cv=@/path/to/your-cv.pdf;type=application/pdf"
```

Example analysis (SSE):

```bash
curl -N -X POST http://localhost:3001/api/sessions/YOUR_SESSION_ID/analyze \
  -H "Content-Type: application/json" \
  -d '{"jobDescription": "Looking for a TypeScript developer with React and GCP experience."}'
```

Delete a session when finished testing:

```bash
curl -X DELETE http://localhost:3001/api/sessions/YOUR_SESSION_ID
```

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
| `RAG_TOP_K` | No | Top-K chunks for retrieval (default: `8`) |
| `MAX_UPLOAD_MB` | No | Max CV upload size in MB (default: `5`) |
| `GEMINI_GENERATION_MODEL` | No | Gemini model for analysis JSON (default: `gemini-2.5-flash`) |

### Option A: Dev Container (recommended)

The Dev Container includes Node 20, npm, Docker CLI, and Docker Compose.

1. Open the project in Cursor and **Reopen in Container**.
2. Add your `GEMINI_API_KEY` to `.env`.
3. Inside the container terminal:

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
| `bash scripts/smoke-test-m1.sh` | Smoke test upload and retrieval (anonymous fixture) |
| `bash scripts/smoke-test-m2.sh` | Smoke test upload and analysis (anonymous fixture) |
| `docker compose down -v` | Stop stack and wipe upload/Chroma volumes |

## Data and privacy

When you upload a CV via the API:

- The original file is stored in the Docker volume `uploads_data` (not in git)
- Chunk text and embeddings are stored in the Chroma Docker volume `chroma_data`
- Text is sent to the Gemini API for embedding and analysis

To remove a single session: `DELETE /api/sessions/:id`

To wipe all uploaded data and vectors: `docker compose down -v`

## Future Improvements

- Milestone 3: Dashboard upload UI, results cards, real progress stepper
- Milestone 4: Chat mode reusing session vector store
- Milestone 5: Production Docker images, logging, integration tests, OpenAI provider stub
