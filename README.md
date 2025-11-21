# 2D Trivia Game

Arabian Nights–inspired party trivia built with a TypeScript backend and a Phaser + React front end. This repo hosts both services so you can run the full multiplayer experience locally or deploy each piece independently.

## Project Layout
- `backend`: Express + Socket.IO server that coordinates rooms, player state, scoring, and trivia cycles.
- `game-client`: Vite-powered React shell that embeds the Phaser experience and talks to the backend over WebSockets.

## Tech Highlights
- Real-time orchestration via Socket.IO, structured into managers (`PlayerManager`, `RoomManager`, `GameManager`, `ScoringService`) for predictable state transitions.
- Phaser 3 scene graph integrated with React 18 for HUD/overlay tooling plus plain TypeScript game logic.
- Vite dev server for hot module reloads and Bun/Node compatibility to keep dependency installs fast.

## Quick Start
1. **Clone & install**
   ```bash
   git clone https://github.com/weknowyourgame/Trivia-2D-Game
   cd 7-fortnite
   bun install --cwd backend
   bun install --cwd game-client
   ```
   (Use `npm install` or `pnpm install` if you prefer.)

2. **Run the backend**
   ```bash
   cd backend
   bun run dev
   ```
   The server boots on `:3000` by default and exposes `/health` plus `/api/stats` for quick diagnostics.

3. **Run the client**
   ```bash
   cd game-client
   bun run dev
   ```
   Open the Vite URL (usually `http://localhost:5173`) and the Phaser scene will connect to `ws://localhost:3000`.

4. **Develop**
   - Update backend logic in `backend/src/**`, keep types in `backend/src/types`.
   - Iterate on Phaser gameplay inside `game-client/src/GameScene.ts`.
   - Hot reload works independently for each service.

## Deployment Notes
- Backend builds with `bun run build` (TypeScript → `dist/`) and can be hosted on any Node-compatible runtime. Set `PORT` and tighten CORS for production.
- Frontend bundles with `bun run build`, producing static assets under `game-client/dist` ready for any static host or CDN.

## Documentation
- `backend/README.md`: service-specific architecture, socket flows, and API surface.
- `game-client/README.md`: client architecture, asset pipeline, and environment expectations.
