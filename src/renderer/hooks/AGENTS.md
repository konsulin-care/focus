# Renderer Hooks AGENTS

- Naming: Hook files must be named `use<Thing>.ts` and exported from `src/renderer/hooks/index.ts`.
- Testing: Mock IPC in hook tests with `vitest.mock('electron')`. All tests belong under `src/renderer/hooks/*.test.ts`.
- Scope: Hooks should only encapsulate UI-logic (e.g., keyboard handling, test-phase tracking). Never embed database calls – delegate to IPC.
- Dependencies: Only import from `@/renderer/store` or `@/renderer/utils` – avoid deep imports to keep the hook reusable.
- Reference: See root AGENTS.md for overall project commands and TypeScript alias info.
