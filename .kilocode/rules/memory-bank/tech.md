# Technology Stack

Desktop Application:
- Electron 40.1.0 (Chromium, Node.js 20)
- React 18.2+
- TypeScript 5.3+
- Zustand 4.4+ (state management)
- Tailwind CSS 4.1+ (via @tailwindcss/vite)
- better-sqlite3 12.6.2 (local database)
- axios 1.6+ (HTTP client - not yet installed)

Build and Development Tools:
- electron-builder 26.7.0+ (cross-platform packaging)
- Vite 5.4+ (build tool, dev server)
- Vitest 4.0+ (unit testing)
- ESLint 9+ (linting)
- Prettier 3+ (code formatting)
- @electron/rebuild 4+ (native module rebuilding)

Backend Services:
- N8N (workflow orchestration - not yet implemented)
- PostgreSQL 15+ (user and normative data storage - not yet implemented)
- HAPI FHIR Server 6+ (healthcare data repository - not yet implemented)
- SuperTokens (authentication - not yet implemented)
- SendGrid or Mailgun (email delivery - not yet implemented)

Development Setup Requirements

System Prerequisites:
- Node.js 18+ and npm 9+
- Git for version control
- Platform-specific build tools:
  - Windows: Visual Studio Build Tools, Windows SDK
  - macOS: Xcode Command Line Tools
  - Linux: build-essential, libsqlite3-dev

Installation Steps:
1. Clone repository
2. Run npm install to install dependencies
3. Run npm run electron-rebuild to compile native modules
4. Copy .env.example to .env and configure:
   - N8N_WEBHOOK_URL
   - SUPERTOKENS_API_URL
   - SUPERTOKENS_API_KEY
5. Run npm run dev for development mode
6. Run npm run build:platform for production builds

Development Commands:
- npm run dev: Start Electron in development mode with hot reload
- npm run build: Build TypeScript and Vite for production
- npm run build:main: Compile TypeScript for main process
- npm run build:renderer: Build React UI for production
- npm run electron-rebuild: Rebuild native modules for Electron
- npm run lint: Run ESLint checks (not yet configured)
- npm run format: Auto-format code with Prettier (not yet configured)
- npm run test: Run unit tests with Vitest (not yet configured)
- npm run package: Build and package for distribution

Technical Constraints

Timing Precision Requirements:
- Must use Node.js process.hrtime.bigint() for all timing measurements
- Cannot rely on JavaScript Date.now() or performance.now() in renderer
- Display refresh rate must be logged and included in metadata
- Target precision: ±1ms standard deviation under normal conditions
- Timing validation runs at startup to verify hardware capability

Cross-Platform Limitations:
- Separate binary builds required for each platform
- Code signing required for macOS distribution (Apple Developer account)
- Windows SmartScreen warnings without code signing certificate
- Linux AppImage works on most distributions but not guaranteed
- BSD support through Linux compatibility layer (not native)

Network and Connectivity:
- Network access disabled in Electron renderer for security
- All HTTP requests must go through main process
- Offline mode required: test must run without internet
- Upload retry queue persists across app restarts
- Maximum payload size: 5MB per test result

Security Constraints:
- SQLite database must use sqlcipher for encryption (not yet implemented)
- No credentials stored in application code
- Environment variables for all API keys and endpoints
- HTTPS-only communication with backend services
- Context isolation enabled in Electron
- Node integration disabled in renderer

Performance Requirements:
- Stimulus presentation latency <16.67ms (60Hz) or <8.33ms (120Hz)
- IPC message roundtrip <1ms
- Test data upload <5 seconds on typical clinic internet
- Application startup time <3 seconds
- Memory footprint <500MB during active test

Dependencies Configuration

Key Dependencies and Versions:
- electron: ^40.1.0
- react: ^18.2.0
- react-dom: ^18.2.0
- typescript: ^5.3.0
- zustand: ^4.4.0
- tailwindcss: ^4.1.18
- @tailwindcss/vite: ^4.1.18
- better-sqlite3: ^12.6.2
- axios: ^1.6.0 (not yet installed)

Dev Dependencies:
- electron-builder: ^26.7.0
- @electron/rebuild: ^4.0.3
- vite: ^5.4.21
- vitest: ^4.0.18
- @vitejs/plugin-react: ^4.2.0
- @types/node: ^20.0.0
- @types/react: ^18.2.0
- @types/react-dom: ^18.2.0
- @types/better-sqlite3: ^7.6.13
- eslint: ^9.39.2
- prettier: ^3.1.0
- typescript-eslint: ^8.54.0
- tailwindcss: ^4.1.18

Native Modules:
- better-sqlite3: Requires node-gyp, platform-specific compilation
- Electron rebuild required after installation: npm run electron-rebuild

Tool Usage Patterns

Electron IPC Pattern:
- Main process exposes handlers via ipcMain.handle()
- Preload script bridges to renderer via contextBridge
- Renderer invokes via window.electronAPI.methodName()
- All timing-critical operations in main process
- All UI interactions in renderer process
- IPC channels: 'get-high-precision-time', 'get-event-timestamp', 'query-database'

State Management Pattern:
- Zustand store for UI state only (loading, current screen, form values)
- Timing data owned by main process TimingEngine
- No Redux or complex state libraries needed
- Props drilling acceptable for small component tree

Styling Pattern:
- Tailwind utility classes for all styling via @tailwindcss/vite
- No custom CSS files except global resets
- Component-level class composition
- No CSS modules or styled-components

Testing Pattern:
- Vitest for unit tests of pure functions
- Mock Electron IPC in tests using vitest.mock()
- Integration tests for timing engine accuracy
- Manual testing required for cross-platform builds

Build Pattern:
- Development: Vite dev server for renderer, Electron for main
- Production: Vite builds renderer, TypeScript compiles main
- Code signing configured in electron-builder per platform
- Output directories: dist/renderer, dist/main

Environment Configuration:
- .env.local for local development (gitignored)
- .env.production for production builds
- Environment variables injected at build time
- No hardcoded URLs or credentials in source code

Logging Pattern:
- Console logging for main process
- No structured logging library yet configured
- Debug mode enables verbose timing logs (development mode)
- Production mode logs errors and warnings only

Database Pattern:
- SQLite with better-sqlite3 for local persistence
- Query whitelist pattern for security (no raw SQL from renderer)
- Predefined commands: get-pending-uploads, get-test-result, delete-test-result, get-upload-count, get-all-test-results, insert-test-result, update-test-result
- Database file stored in app.getPath('userData')
