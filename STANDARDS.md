---
title: F.O.C.U.S. Project Coding Standards
description: Coding standards for TypeScript, styling, components, hooks, and testing in the F.O.C.U.S. project
priority: high
updated: 2026-05-01
---

## TypeScript Path Alias (@/ alias)

**Rule:** All internal renderer imports (types, utils, hooks, components, store) MUST use `@/renderer/...` alias.

**Why:** Eliminates fragile relative paths, improves readability, simplifies refactoring.

**Correct:**
```typescript
import { TestEvent } from '@/renderer/types/electronAPI';
import { useNavigation } from '@/renderer/store';
import StimulusDemo from '@/renderer/components';
import { useAttentionMetrics } from '@/renderer/hooks/useAttentionMetrics';
```

**Avoid:** Deep relative paths like `../../types/electronAPI`.

## Tailwind-only Styling

**Rule:** All styling must use ONLY Tailwind utility classes.

**[Correct]:** `<div className="flex flex-col items-center p-4">`
**[Incorrect]:** `<div style={{ display: 'flex', flexDirection: 'column' }}>`

Global resets in `index.css` permitted but minimal. Use `@layer` only if absolutely necessary.

## Component Naming & Barrel Exports

**File Naming:** PascalCase (e.g., `TestHeader.tsx`)
**Barrel Export:** Every component folder MUST have `index.ts` exporting components.

**Correct:** `import { TestHeader } from '@/renderer/components/Test'`
**Avoid:** `import { TestHeader } from '@/renderer/components/Test/TestHeader'`

## Hooks Naming & Usage

**File Naming:** `use<Thing>.ts` (e.g., `useAttentionMetrics.ts`)
**Export:** All hooks from `src/renderer/hooks/index.ts`

**Rules:**
- Encapsulate UI-logic only (no DB/IPC calls)
- Import only from: `@/renderer/store`, `@/renderer/utils`, `react`/`react-dom`
- Avoid deep internal imports

**Correct:** `import { useAttentionMetrics } from '@/renderer/hooks'`
**Avoid:** `import { useAttentionMetrics } from '@/renderer/hooks/useAttentionMetrics'`

## Testing Conventions

**Placement:** Test files alongside implementation (`src/**/*.test.ts` or `.test.tsx`)
**Framework:** Vitest (`npm test`, `npm run test:watch`, `npm run test:coverage`)
**Mocking IPC:** Mock `electron` or preload-exposed APIs in tests.

**Example:**
```typescript
import { describe, test, expect, vi } from 'vitest';
import { calculateAttentionMetrics } from '@/renderer/utils/trial-metrics';

describe('calculateAttentionMetrics', () => {
  test('returns correct metrics', () => {
    // test implementation
  });
});
```

Adhering to these standards ensures a clean, maintainable, and consistent codebase. When in doubt, refer to this document or examine existing code that follows the guidelines. For agent-specific guidance (commands, project structure, etc.), see `AGENTS.md`.
