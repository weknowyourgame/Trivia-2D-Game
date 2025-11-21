# Backend

Real-time orchestration service for the Arabian Nights trivia experience. The backend exposes a thin REST surface for health/statistics and uses Socket.IO for everything gameplay-related: lobby flow, room lifecycle, question delivery, scoring, and round transitions.

## Stack
- Node.js 18+ or Bun runtime
- Express 4 for HTTP endpoints and middleware
- Socket.IO 4 for bi-directional events
- TypeScript 5 with `ts-node-dev` for local iteration

## Project Structure
- `src/server.ts`: Express + Socket.IO bootstrap, health endpoints, graceful shutdown.
- `src/handlers/socketHandlers.ts`: Central registry for connection, room, game, and scoring events.
- `src/services/`: Domain managers
  - `PlayerManager`: tracks connections and metadata
  - `RoomManager`: handles room creation, cleanup, and membership
  - `GameManager`: runs round phases and question rotation
  - `ScoringService`: aggregates points and leaderboards
- `src/data/questions.ts`: Trivia bank
- `src/types/`: Shared interfaces for strong typing across services

## Getting Started
```bash
cd backend
bun install        # or npm install / pnpm install
bun run dev        # ts-node-dev watcher on port 3000
```

Environment variables:
- `PORT` (default `3000`)
- `CORS_ORIGIN` (optional; defaults to `*`—tighten for production)

## Scripts
- `bun run dev`: Fast reload development server.
- `bun run build`: Compile TypeScript into `dist/`.
- `bun run start`: Serve compiled output (use in production).
- `bun run lint`: Run ESLint across `src/**`.

## HTTP Surface
- `GET /health`: Liveness + aggregated room/game/player counts.
- `GET /api/stats`: Detailed room and game metadata for dashboards or ops consoles.

## Socket Lifecycle (high level)
1. Client connects → `SocketHandlers` registers the player and joins/creates a room.
2. Room owner triggers start → `GameManager` spins up rounds based on `questions.ts`.
3. `ScoringService` tallies answers, emits leaderboard events, and the cycle repeats until completion.
4. Cleanup runs every minute to recycle empty rooms.

Keep event names in sync with the client; add type definitions in `src/types` to document payloads when introducing new flows.

## Testing & Observability
- Use `GET /health` as a readiness probe.
- Attach Bunyan/Pino or another logger inside the managers if you need deeper traces.
- Pair with the `backend/test-client.js` script to simulate multiple socket joins without the Phaser UI.
