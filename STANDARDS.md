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

## ES Module Import Standards

**Rule:** Use **named imports** for Node.js built-in modules and external dependencies. Avoid namespace/wildcard imports (`import * as`).

**Why:** Named imports enable tree-shaking, make dependencies explicit, and improve static analysis.

### Node.js Built-in Modules

**Correct:**
```typescript
import { randomBytes } from 'node:crypto';
import { join, basename } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
```

**Avoid:**
```typescript
import * as crypto from 'node:crypto';  // ❌ Namespace
import * as path from 'node:path';      // ❌ Namespace
```

### External Dependencies

**Correct:**
```typescript
import { z } from 'zod';
import { create } from 'zustand';
import axios from 'axios';  // default import when library exports default
```

**Avoid:**
```typescript
import * as z from 'zod';         // ❌
import * as zustand from 'zustand'; // ❌
```

### Type-Only Imports

**Correct:**
```typescript
import type { ElectronAPI } from '@/renderer/types/electronAPI';
import type { FC } from 'react';
```

**When to use `import type`:**
- For TypeScript type declarations that have no runtime presence
- Prevents accidental runtime imports of types-only constructs

### Default vs Named Imports

Use **named imports** whenever possible. Only use default imports when:
- The library explicitly exports a default (e.g., `export default …`)
- The library's entire API is a single namespace object (e.g., `axios`, `moment`)

### Import Ordering

Group imports in this order:
1. **Node.js built-ins** (`node:` protocol)
2. **External packages** (from `node_modules`)
3. **Internal modules** (using `@/` alias)

**Example:**
```typescript
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { create } from 'zustand';
import type { AttentionMetrics } from '@/renderer/types';
import { useStore } from '@/renderer/store';
```

---

## Development Environment Standards

**Rule:** This project requires mise for Node.js version management to ensure reproducible builds.

**Why:** Eliminates "works on my machine" issues, satisfies package engine requirements (EBADENGINE warnings), and provides cryptographic verification of tool integrity.

**mise.toml** (Intent):
- Defines desired version ranges (e.g., `node = "24"`)
- Committed to version control as expression of version intentions
- Human-editable for version updates

**mise.lock** (Guarantee):
- Auto-generated by `mise lock`; contains exact versions and checksums
- Committed to version control as guarantee of reproducibility
- Never edited manually; updated via `mise lock` after changing mise.toml

### Benefits
1. **Reproducibility:** Exact same Node.js version across all developers and CI
2. **Security:** Checksum verification prevents tampered downloads
3. **Team Consistency:** Eliminates version-related bugs and warnings
4. **CI/CD Friendly:** `mise install` in pipelines guarantees consistent tooling

### Team Onboarding Process
1. Install mise: `brew install mise` (macOS)
2. Clone repository
3. Run `mise install` (installs exact Node.js version from mise.lock)
4. Verify: `node -v` shows >=24.0
5. Use `mise exec -- <command>` for all project commands
