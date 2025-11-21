# Game Client

Vite + React shell that embeds the Phaser 3 experience for the Arabian Nights trivia arena. The client renders game scenes in WebGL, handles UI overlays in React, and communicates with the backend through Socket.IO.

## Stack
- React 18 with functional components and hooks
- Phaser 3.60 for game scenes (`src/GameScene.ts`)
- Socket.IO client 4.8 for multiplayer messaging
- Vite 5 for dev server and bundling
- TypeScript everywhere for type safety

## Directory Overview
- `src/main.tsx`: React entry point, mounts the HUD and boots Phaser.
- `src/GameScene.ts`: Core gameplay loop, assets, state machine, and socket listeners.
- `public/`: Static assets (images, audio, fonts). Add new files here.
- `vite.config.ts`: React plugin config, proxy adjustments go here if you host the backend elsewhere.

## Setup
```bash
cd game-client
bun install           # or npm install / pnpm install
bun run dev           # starts Vite on :5173
```

Set `VITE_BACKEND_URL` in a `.env` file to point at a non-default server:
```
VITE_BACKEND_URL=http://localhost:3000
```
Without this variable, the client falls back to the local development server URL.

## Scripts
- `bun run dev`: Vite dev server with HMR and fast refresh.
- `bun run build`: Production bundle (outputs to `dist/`).
- `bun run preview`: Serves the production build locally to verify deploy artifacts.

## Working With Phaser
- Update gameplay in `GameScene.ts`. The file is large; group logic into helper classes/modules if you expand mechanics.
- Use `scene.preload` to load assets from `public/`.
- Register socket listeners in `create()` and clean them up in `shutdown()` to prevent leaks during hot reloads.

## Integrating With The Backend
- Ensure the backend is running (`http://localhost:3000`) before connecting; otherwise Phaser will boot but sockets will fail to authenticate.
- All lobby/gameplay events mirror the names defined in `backend/src/handlers/socketHandlers.ts`.
- When adding or changing events, update the shared payload types in `backend/src/types` and import them into the client for compile-time safety.

## Production Build & Deployment
1. `bun run build`
2. Upload `dist/` to your static host (Vercel, Netlify, S3 + CloudFront, etc.).
3. Configure `VITE_BACKEND_URL` at build time so the client uses the correct Socket.IO origin.

## Troubleshooting
- **Black screen**: Check the browser console for Phaser errors—usually missing assets or failure to connect to the backend.
- **Socket disconnect loops**: Verify CORS and `VITE_BACKEND_URL` align with the backend origin.
- **Stale assets**: Clear the Vite cache (`rm -rf node_modules/.vite`) or force-reload the page.
