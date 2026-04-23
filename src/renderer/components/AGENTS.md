# Renderer Components AGENTS

- File Naming: Component files use PascalCase (e.g., `TestHeader.tsx`). Non-default exports are discouraged; use a default export when appropriate.
- Barrel Export: Every component folder must contain an `index.ts` that re-exports the component. Import from the folder, not the file.
- Tailwind-Only: All styling must be expressed with Tailwind utilities. No `className` strings that are not Tailwind-compatible.
- Responsibility: Components are presentational only – any state/logic lives in a hook or the Zustand store.
- Event Flow: Stimulus rendering components (`StimulusContainer`, `TargetStimulus`, `NonTargetStimulus`) receive timestamps via props from the renderer; they never call IPC directly.
- Reference: Root AGENTS.md holds global commands and the TypeScript alias map.
