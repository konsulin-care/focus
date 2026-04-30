# Renderer Hooks AGENTS

- Naming: Hook files must be named `use<Thing>.ts` and exported from `src/renderer/hooks/index.ts`.
- Testing: Mock IPC in hook tests with `vitest.mock('electron')`. All tests belong under `src/renderer/hooks/*.test.ts`.
- Scope: Hooks should only encapsulate UI-logic (e.g., keyboard handling, test-phase tracking). Never embed database calls – delegate to IPC.
- Dependencies: Only import from `@/renderer/store`, `@/renderer/utils`, and allowed external modules like `react`, `react-dom` – avoid deep/internal imports to keep the hook reusable. (Deep/internal imports refer to deep paths within our repo; importing from external packages like react is permitted.)
- Reference: See root AGENTS.md for overall project commands and TypeScript alias info.
