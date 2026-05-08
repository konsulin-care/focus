---
title: Renderer Components AGENTS
description: Component naming, export conventions, and styling guidelines for F.O.C.U.S. renderer process
priority: high
updated: 2026-05-01
---

- File Naming: Component files use PascalCase (e.g., `TestHeader.tsx`). Non-default exports are discouraged; use a default export when appropriate.
- Barrel Export: Every component folder must contain an `index.ts` that re-exports the component. Import from the folder, not the file.
- Tailwind-Only: All styling must be expressed with Tailwind utilities. No `className` strings that are not Tailwind-compatible.
- Responsibility: Components are presentational only – any state/logic lives in a hook or the Zustand store.
- Event Flow: Stimulus rendering components (`StimulusContainer`, `TargetStimulus`, `NonTargetStimulus`) receive timestamps via props from the renderer; they never call IPC directly.
- For coding standards including import conventions, see ../STANDARDS.md.
- Reference: Root AGENTS.md holds global commands and the TypeScript alias map.

## Admin Components

All admin-related components reside in `src/renderer/components/Admin/` and follow these conventions:

### Naming
- PascalCase, all files inside the `Admin/` folder (e.g., `AdminLoginModal.tsx`, `AdminRegisterModal.tsx`).
- Barrel export via `index.ts` re-exporting each component.

### `AdminLoginModal`
- **Props**: `isOpen: boolean`, `mandatory: boolean`, `onSuccess: (token: string) => void`, `onClose: () => void`
- Displays a password input and login button. On success, the obtained session token is passed to `onSuccess`.
- When `mandatory` is true, the modal cannot be dismissed without successful authentication.

### `AdminRegisterModal`
- **Props**: `onComplete: (recoveryKey: string) => void`
- Handles first-time admin registration by accepting a password and confirming it.
- On successful registration, displays the one-time recovery key to the user and calls `onComplete` with the key.

### `RecoveryModal`
- Implements a two-step recovery flow:
  1. **Step 1** – User enters their recovery key; the renderer calls `requestRecovery` to obtain a reset token.
  2. **Step 2** – User enters a new password (and confirmation); the renderer calls `completeRecovery` with the reset token and new password.
- Progress is tracked via internal state; the modal shows step indicators and appropriate error messages.

### `ChangePasswordModal`
- **Props**: `isOpen: boolean`, `onClose: () => void`
- Allows an authenticated admin to change their password. Requires the old password and a new password (with confirmation).
- Calls `changePassword` on the preload API; closes on success or explicit dismiss.

### Styling
- All components use Tailwind utility classes only. No inline styles or external CSS files.
