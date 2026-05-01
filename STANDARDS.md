# F.O.C.U.S. Project Coding Standards

This document outlines the coding standards for the F.O.C.U.S. project. All contributors are expected to follow these guidelines to ensure consistency and maintainability.

## Table of Contents
1. [TypeScript Path Alias (@/ alias)](#typescript-path-alias--alias-)
2. [Tailwind-only Styling Rule](#tailwind-only-styling-rule)
3. [Component Naming and Barrel Exports](#component-naming-and-barrel-exports)
4. [Hooks Naming and Usage](#hooks-naming-and-usage)
5. [Testing Conventions](#testing-conventions)

---

## TypeScript Path Alias (@/ alias)

### Rationale
- **Eliminates fragile deep relative paths**: Avoids errors when moving files or changing directory depth.
- **Improves readability**: Shorter, more explicit imports (e.g., `@/renderer/types/electronAPI` vs `../../../types/electronAPI`).
- **Simplifies refactoring**: Changes in directory structure do not require updating numerous import paths.
- **Aligns with tooling**: Works seamlessly with TypeScript path mapping and Vite configuration.

### Configuration
The `@/` alias is configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```
This means:
- `@/` resolves to the `src/` directory.
- `@/renderer/` resolves to `src/renderer/`.
- `@/renderer/types/` resolves to `src/renderer/types/`, and so on.

### Usage Examples
#### Correct (using alias)
```typescript
// Importing types
import { TestEvent } from '@/renderer/types/electronAPI';
import type { AttentionMetrics, SubjectInfo } from '@/renderer/types/trial';

// Importing utilities
import { generateAcsCalculationDetails } from '@/renderer/utils/acs-calculation';
import { normalCDF } from '@/renderer/utils/statistics';

// Importing store
import { useNavigation } from '@/renderer/store';

// Importing components (from index barrel)
import StimulusDemo from '@/renderer/components';
import { SidebarButton } from '@/renderer/components/SidebarButton';

// Importing hooks
import { useAttentionMetrics } from '@/renderer/hooks/useAttentionMetrics';
```

#### Incorrect (deep relative paths to avoid)
```typescript
// Avoid these deep relative imports
import { TestEvent } from '../../../types/electronAPI';
import { AttentionMetrics, SubjectInfo } from '../../types/trial';
import { generateAcsCalculationDetails } from '../../utils/acs-calculation';
import { useNavigation } from '../store';
import StimulusDemo from '../../components/StimulusDemo';
import { useAttentionMetrics } from '../hooks/useAttentionMetrics';
```

### Rule
**All imports of internal renderer modules (types, utils, hooks, components, store, i18n) MUST use the `@/renderer/...` alias.**
When importing from the `public` folder or root assets (e.g., `package.json`, `logo.svg`), use `@/../` to step out of `src/` (as established in the codebase).

---

## Tailwind-only Styling Rule

### Rationale
- Ensures consistency in styling approach.
- Avoids CSS specificity issues and styling conflicts.
- Leverages Tailwind's utility-first paradigm for rapid UI development.
- Simplifies theme management and dark mode implementation.

### Rule
**All styling must be expressed exclusively with Tailwind utility classes.**
- Do not write custom CSS or use `style` attributes for styling.
- Global resets (in `index.css`) are permitted but should be minimal.
- Use Tailwind's `@layer` directives for custom component styles if absolutely necessary, but prefer utility classes.

### Example
```tsx
// ✅ Correct
<div className="flex flex-col items-stretch text-center mt-6 font-mono text-lg text-white max-w-2xl w-full">
  {/* Content */}
</div>

// ❌ Incorrect
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
  {/* Content */}
</div>
```

---

## Component Naming and Barrel Exports

### File Naming
- Component files must use PascalCase (e.g., `TestHeader.tsx`, `AcsScoreCard.tsx`).
- Non-default exports are discouraged; use a default export when appropriate.

### Barrel Export
- Every component folder **must** contain an `index.ts` that re-exports the component(s).
- Import from the folder, not the file directly.

### Example
Given the structure:
```
src/renderer/components/Test/
  TestHeader.tsx
  index.ts
```

`src/renderer/components/Test/index.ts`:
```typescript
export { TestHeader } from './TestHeader';
// Export other components from this folder as needed
```

Then import as:
```typescript
// ✅ Correct
import { TestHeader } from '@/renderer/components/Test';

// ❌ Avoid
import { TestHeader } from '@/renderer/components/Test/TestHeader';
```

---

## Hooks Naming and Usage

### File Naming
- Hook files must be named `use<Thing>.ts` (e.g., `useAttentionMetrics.ts`, `useTestPhase.ts`).
- All hook files must be exported from `src/renderer/hooks/index.ts`.

### Scope and Dependencies
- Hooks should only encapsulate UI-logic (e.g., keyboard handling, test-phase tracking).
- Never embed database calls or direct IPC; delegate to the main process via preload IPC.
- Only import from:
  - `@/renderer/store`
  - `@/renderer/utils`
  - External modules like `react`, `react-dom`
- Avoid deep/internal imports (deep paths within the repo) to keep hooks reusable.

### Example
`src/renderer/hooks/useAttentionMetrics.ts`:
```typescript
import { useState, useCallback } from 'react';
import { TestEvent } from '@/renderer/types/electronAPI';
import { SubjectInfo, AttentionMetrics } from '@/renderer/types/trial';
import { calculateAttentionMetrics } from '@/renderer/utils/trial-metrics';

export function useAttentionMetrics() {
  // Hook implementation
}
```

`src/renderer/hooks/index.ts`:
```typescript
export { useAttentionMetrics } from './useAttentionMetrics';
// Export other hooks
```

Then import as:
```typescript
// ✅ Correct
import { useAttentionMetrics } from '@/renderer/hooks';

// ❌ Avoid
import { useAttentionMetrics } from '@/renderer/hooks/useAttentionMetrics';
```

---

## Testing Conventions

### Test File Placement
- Develop test components in the following directories:
  - `src/**/*.test.ts`
  - `src/**/*.test.tsx`
- Place test files alongside the implementation they test.

### Test Framework
- Use Vitest for all unit tests.
- Run tests with `npm test` (or `npm run test:watch` / `npm run test:coverage` for watch mode or coverage).

### Mocking IPC
- When testing renderer code that uses IPC, mock the `electron` module:
  ```typescript
  import { test, expect } from 'vitest';
  import { window } from 'electron'; // or however you access electronAPI

  // In test setup
  vi.mock('electron', () => ({
    // Mock ipcRenderer or custom electronAPI
    ipcRenderer: {
      invoke: vi.fn(),
      send: vi.fn(),
      // ...etc
    },
  }));
  ```
- Alternatively, if using a preload-exposed API, mock that API directly.

### Coverage
- Generate coverage reports with `npm run test:coverage`.
- Aim for high coverage on critical logic (timing calculations, IPC handling, state updates).

### Example Test File
`src/renderer/utils/attention-metrics.test.ts`:
```typescript
import { describe, test, expect, vi } from 'vitest';
import { calculateAttentionMetrics } from '@/renderer/utils/trial-metrics';
// Mock dependencies if needed

describe('calculateAttentionMetrics', () => {
  test('returns correct metrics for valid input', () => {
    // Test implementation
  });
});
```

---

## Conclusion
Adhering to these standards ensures a clean, maintainable, and consistent codebase. When in doubt, refer to this document or examine existing code that follows the guidelines. For agent-specific guidance (commands, project structure, etc.), see `AGENTS.md`.
