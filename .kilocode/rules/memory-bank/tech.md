# Technology Stack

Desktop Application:
- Electron 28+ (Chromium 120, Node.js 20)
- React 18.2+
- TypeScript 5.3+
- Zustand 4.4+ (state management)
- Tailwind CSS 3.4+
- better-sqlite3 8.7+ (local database)
- axios 1.6+ (HTTP client)

Build and Development Tools:
- electron-builder 24+ (cross-platform packaging)
- Vite 5+ (build tool, dev server)
- Vitest 1+ (unit testing)
- ESLint 8+ (linting)
- Prettier 3+ (code formatting)

Backend Services:
- N8N (workflow orchestration, self-hosted or cloud)
- PostgreSQL 15+ (user and normative data storage)
- HAPI FHIR Server 6+ (healthcare data repository)
- SuperTokens (authentication, self-hosted or managed)
- SendGrid or Mailgun (email delivery)

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
3. Copy .env.example to .env and configure:
   - N8N_WEBHOOK_URL
   - SUPERTOKENS_API_URL
   - SUPERTOKENS_API_KEY
4. Run npm run dev for development mode
5. Run npm run build:platform for production builds

Development Commands:
- npm run dev: Start Electron in development mode with hot reload
- npm run lint: Run ESLint checks
- npm run format: Auto-format code with Prettier
- npm run test: Run unit tests with Vitest
- npm run build:win: Build Windows installer
- npm run build:mac: Build macOS DMG and app bundle
- npm run build:linux: Build Linux AppImage and deb
- npm run build:all: Build for all platforms (requires appropriate OS)

Technical Constraints

Timing Precision Requirements:
- Must use Node.js process.hrtime.bigint() for all timing measurements
- Cannot rely on JavaScript Date.now() or performance.now() in renderer
- Display refresh rate must be logged and included in metadata
- Target precision: ±1ms standard deviation under normal conditions

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
- SQLite database must use sqlcipher for encryption
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
- electron: ^28.0.0
- react: ^18.2.0
- typescript: ^5.3.0
- zustand: ^4.4.0
- tailwindcss: ^3.4.0
- better-sqlite3: ^8.7.0
- axios: ^1.6.0
- @supertokens-web-js/session: ^0.5.0

Dev Dependencies:
- electron-builder: ^24.9.0
- vite: ^5.0.0
- vitest: ^1.0.0
- @vitejs/plugin-react: ^4.2.0
- eslint: ^8.56.0
- prettier: ^3.1.0
- typescript-eslint: ^6.15.0

Native Modules:
- better-sqlite3: Requires node-gyp, platform-specific compilation
- Electron rebuild required after installation: npm run electron-rebuild

Tool Usage Patterns

Electron IPC Pattern:
- Main process exposes handlers via ipcMain.handle()
- Preload script bridges to renderer via contextBridge
- Renderer invokes via window.tovaAPI.methodName()
- All timing-critical operations in main process
- All UI interactions in renderer process

State Management Pattern:
- Zustand store for UI state only (loading, current screen, form values)
- Timing data owned by main process TimingEngine
- No Redux or complex state libraries needed
- Props drilling acceptable for small component tree

Styling Pattern:
- Tailwind utility classes for all styling
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
- Production: Vite builds renderer, electron-builder packages all
- Code signing configured in electron-builder.json per platform
- Auto-update configuration using electron-updater

Environment Configuration:
- .env.local for local development (gitignored)
- .env.production for production builds
- Environment variables injected at build time
- No hardcoded URLs or credentials in source code

Logging Pattern:
- electron-log for both main and renderer processes
- Logs written to platform-specific locations
- Log rotation enabled (max 5MB per file)
- Debug mode enables verbose timing logs
- Production mode logs errors and warnings only
