---
title: F.O.C.U.S. Project AGENTS Guide
description: Core commands, project structure, and guidelines for AI agents working on the F.O.C.U.S. Electron application
priority: high
updated: 2026-05-01
---

## Identity
- Role: The agent is a specialized AI assistant for the F.O.C.U.S. project, tasked with exploring, planning, guiding development activities, and implementing the best practice.
- Tone: Professional and technical, providing clear, concise, and accurate information.

## Core Commands
- `npm install` → then mandatory `npm run electron-rebuild` (native modules)
- `npm run dev` – start Electron in dev mode
- `npm run build` – compile main (tsc) + Vite renderer
- `npm run test` – Vitest unit tests, can be specified as `npm run test:watch` / `npm run test:coverage`
- `npm run validate-timing` – verify hardware meets ±1 ms precision
- `npm run package` – produce OS‑specific installers (electron‑builder)

## Project Structure (high‑signal)
- `src/main/` – Electron main process (timing engine, Inter-Process Communication/IPC, DB, network)
- `src/renderer/` – React UI, Zustand store, Tailwind styling
- `src/preload/` – Context bridge exposing safe IPC to renderer
- `dist/` – Build output (`dist/main`, `dist/renderer`)
- `data/` – test‑data.json used by metrics unit tests

## TypeScript Path Alias
- `@/` resolves to `src/` (tsconfig + vite config). Use for imports to avoid deep relative paths. For full details on import standards, see STANDARDS.md.

## Vite Configuration
- Base `./`, root `src/renderer`, outDir `../../dist/renderer` (see `vite.config.mjs`).

## Electron Quirks
- Rebuild required after any `npm install` or native‑module change (e.g., better-sqlite3, keytar).
- Renderer cannot access filesystem or network directly; all privileged ops go through preload IPC.
- Timing should always use `process.hrtime.bigint()` in main; never use `Date.now()` or `performance.now()` in renderer; unless `process.hrtime.bigint()` returns an error.

## Testing Nuances
- Develop test components in the following directories:
  - `src/**/*.test.ts`
  - `src/**/*.test.tsx`
- Run all tests with Vitest
- Mock IPC with `vitest.mock('electron')` if needed.
- Coverage report generated with `npm run test:coverage`.

## Security / Data
- Encrypted SQLite (SQLCipher) stored in OS userData path.
- No credentials in source; configure via `.env` (`N8N_WEBHOOK_URL`, `SUPERTOKENS_*`).

## Node.js Built-in Imports
- Use `node:` protocol for Node.js built-in modules (e.g., `import * as crypto from 'node:crypto'`).
- The `node:` protocol improves clarity and avoids potential conflicts.

## Sub‑module AGENTS.md locations
- `src/main/AGENTS.md` – main‑process IPC and timing details.
- `src/renderer/AGENTS.md` – UI state, Zustand patterns, Tailwind usage.
- `src/renderer/components/AGENTS.md` – component naming, export index conventions.
- `src/renderer/hooks/AGENTS.md` – custom hook patterns and testing.

## Coding Standards Reference
For comprehensive coding standards including TypeScript Path Alias usage, Tailwind styling rules, component conventions, hooks patterns, and testing guidelines, refer to STANDARDS.md.
