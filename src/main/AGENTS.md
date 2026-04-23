# Main Process AGENTS

- IPC handlers defined in `src/main/ipc-handlers.ts`; all use `ipcMain.handle`.
- Timing engine lives in `src/main/timing.ts`; always called via IPC.
- Database manager (`src/main/database.ts`) only accessed from main; renderer must request via IPC.
- Network manager (future) will also be main‑only.
- Remember to rebuild native modules (better-sqlite3, keytar) after any version change.

## Reference
See root AGENTS.md for global commands, TypeScript alias, and project-wide constraints.
