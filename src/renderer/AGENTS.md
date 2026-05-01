# Renderer AGENTS

- All UI state lives in `src/renderer/store/index.ts` (Zustand).
- Use `window.electronAPI.*` for IPC; never require Electron modules directly.
- Styling: Tailwind utility classes only; no custom CSS (except global resets).
- Components live under `src/renderer/components/<feature>/`; index barrel per folder.
- Preload exposes a type‑safe API; add new channels there before using in renderer.
- Remember: `process.hrtime.bigint()` is unavailable; use IPC to main for precise timestamps.
- Modern UI patterns: Use flexbox layouts, Clipboard API with proper error handling, and accessible interactive elements.

## Coding Standards Reference
For detailed coding standards including TypeScript Path Alias usage, Tailwind styling rules, component conventions, hooks patterns, and testing guidelines, refer to @STANDARDS.md.

## Reference
See root AGENTS.md for global commands, TypeScript alias, and project-wide constraints.
