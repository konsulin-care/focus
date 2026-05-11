---
title: Main Process AGENTS
description: Main process IPC, timing engine, database, and network management for F.O.C.U.S. Electron application
priority: high
updated: 2026-05-01
---

- IPC handlers defined in `src/main/ipc-handlers.ts`; all use `ipcMain.handle`.
- Timing engine lives in `src/main/timing.ts`; always called via IPC.
- Database manager (`src/main/database.ts`) only accessed from main; renderer must request via IPC.
- Network manager (future) will also be main‑only.
- Remember to rebuild native modules (better-sqlite3, keytar) after any version change.
- Use `node:` protocol for Node.js built-in modules using named imports (e.g., `import { join } from 'node:path'`, `import { randomBytes } from 'node:crypto'`).

## Authentication Module

### `auth.ts`
- **Registration** – creates a new admin account, derives encryption keys, stores the hashed password, and returns a recovery key to the renderer.
- **Login** – verifies credentials against the hashed password in the database, returns a session token on success.
- **Session management** – maintains an in-memory `Map<string, Session>` with a 10‑minute TTL per entry; expired sessions are evicted on access.
- **Recovery** – two-step flow: (1) verify the recovery key to generate a password-reset token, (2) accept a new password and re-encrypt stored keys.
- **Rate limiting** – tracks failed attempts per device; after 5 consecutive failures the account locks out for 1 minute.

### `key-management.ts`
- **LMK (Local Master Key)** – a device-specific key derived from the OS keychain / native crypto; used as the root of all encryption.
- **Encryption / decryption** – all sensitive data (password hash, recovery key material) is encrypted with keys bound to the LMK before storage.
- **Device UUID** – a persistent identifier generated once per device installation; used as a salt component in key derivation and as the session identifier.

### `generated-config.ts`
- Auto-generated during CI builds; contains build-time constants and secrets.
- Must never be committed to version control; listed in `.gitignore`.

### Session management pattern
- Sessions are stored in an in-memory `Map<string, Session>` keyed by session token.
- Each session carries a `createdAt` timestamp; on every lookup the entry is checked for 10‑minute expiry and evicted if stale.
- No persistence across process restarts – the renderer must re-authenticate after an Electron restart.

### Rate limiting
- Failed login or recovery attempts are counted per device UUID.
- After 5 failures the account enters a 1‑minute lockout; the counter resets on success.

### `requireAdmin` guard pattern
- IPC handlers that protect sensitive operations (Settings, Data Management) call `requireAdmin(sessionToken)` before executing.
- If the token is missing, expired, or invalid, the handler rejects with an auth error, preventing unauthorized access.

## Reference
See root AGENTS.md for global commands, TypeScript alias, and project-wide constraints.
