# Preload AGENTS

- Bridge API: Only the functions listed in `src/preload/preload.ts` are exposed to the renderer via `contextBridge.exposeInMainWorld('electronAPI', …)`.
- Type Safety: Every exposed method must have a matching TypeScript declaration in `src/renderer/types/electronAPI.ts`.
- Security: Never expose Node/Electron modules directly; keep the API surface minimal (e.g., `getHighPrecisionTime`, `recordResponse`, `queryDatabase`).
- Versioning: If a new IPC channel is added, bump the semantic version in `package.json` and document the channel here.
- Reference: Global constraints are in the root AGENTS.md.