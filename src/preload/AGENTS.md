---
title: Preload AGENTS
description: Preload script guidelines for safe IPC exposure in F.O.C.U.S. Electron application
priority: high
updated: 2026-05-01
---

- Bridge API: Only the functions listed in `src/preload/preload.ts` are exposed to the renderer via `contextBridge.exposeInMainWorld('electronAPI', …)`.
- Type Safety: Every exposed method must have a matching TypeScript declaration in `src/renderer/types/electronAPI.ts`.
- Security: Never expose Node/Electron modules directly; keep the API surface minimal (e.g., `getHighPrecisionTime`, `recordResponse`, `queryDatabase`).
- Versioning: If a new IPC channel is added, bump the semantic version in `package.json` and document the channel here.
- Reference: Global constraints are in the root AGENTS.md.

## Admin Authentication API

### Exposed `auth*` methods
All auth channels are exposed through `window.electronAPI`:

| Method | Signature | Description |
|---|---|---|
| `registerAdmin` | `(password: string): Promise<{ recoveryKey: string }>` | Registers a new admin, returns the one-time recovery key |
| `loginAdmin` | `(password: string): Promise<{ token: string }>` | Authenticates and returns a session token |
| `verifySession` | `(token: string): Promise<{ valid: boolean }>` | Verifies a session token is active and not expired |
| `logoutAdmin` | `(): Promise<void>` | Invalidates the current session token |
| `requestRecovery` | `(recoveryKey: string): Promise<{ resetToken: string }>` | Step 1 of recovery – validates the recovery key |
| `completeRecovery` | `(resetToken: string, newPassword: string): Promise<void>` | Step 2 of recovery – sets a new password |
| `changePassword` | `(oldPassword: string, newPassword: string): Promise<void>` | Changes password for an authenticated session |

### Session token flow
1. The renderer calls `loginAdmin(password)` (or `registerAdmin` for first-time setup) to obtain a session token.
2. The renderer stores the token in memory (never on disk).
3. For every protected IPC call, the renderer includes the token in the payload.
4. The main process verifies the token via `verifySession` or the `requireAdmin` guard before proceeding.
5. On logout or token expiry (10 min), the renderer discards the token and requires re-authentication.

### Protected IPC handlers
- Any handler in `src/main/ipc-handlers.ts` that relates to Settings or Data Management requires a valid session token.
- The `requireAdmin` guard is invoked before the handler body executes; an invalid or missing token results in a rejected promise.
