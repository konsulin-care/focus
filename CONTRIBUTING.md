# Contributing to F.O.C.U.S.

Thank you for considering contributing to the F.O.C.U.S. project! Please read these guidelines to help make the contribution process smooth and effective.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/focus.git`
3. Install dependencies: `npm install`
4. **Important**: After any `npm install` or native module change, run: `npm run electron-rebuild`
5. Start development: `npm run dev`

## Coding Standards

### TypeScript
- Use strict TypeScript mode (`tsconfig.json` already configured)
- Follow existing code style in the repository
- Use `@/` alias for imports to avoid deep relative paths
- Use `node:` protocol for Node.js built-in modules (e.g., `import * as crypto from 'node:crypto'`)

### Electron Specifics
- **Main Process**: Use `process.hrtime.bigint()` for precise timing
- **Renderer Process**: Never access filesystem or network directly; use IPC via `window.electronAPI.*`
- **Native Modules**: Remember to rebuild after version changes (`npm run electron-rebuild`)

### Styling (Renderer)
- Use Tailwind utility classes only
- No custom CSS except for global resets
- Follow existing component patterns in `src/renderer/components/`

### Testing
- Write tests for new functionality
- Test files should be placed alongside source files with `.test.ts` or `.test.tsx` extension
- Run tests with: `npm run test`
- For coverage: `npm run test:coverage`
- Mock IPC in tests with `vitest.mock('electron')` when needed

## Pull Request Process

1. Create a new branch for your feature/fix: `git checkout -b feature/your-feature-name`
2. Make your changes following the coding standards above
3. Ensure all tests pass: `npm run test`
4. Update documentation if needed
5. Commit your changes with clear, descriptive commit messages
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request against the main repository

## Documentation

- Update relevant AGENTS.md files when adding new patterns or conventions
- Keep documentation in sync with code changes
- Follow existing documentation style and structure

## Reporting Issues

When reporting bugs or issues, please include:
- Steps to reproduce the behavior
- Expected behavior vs actual behavior
- Screenshots if applicable
- Environment details (OS, Node.js version, etc.)

Thank you for contributing to F.O.C.U.S.!