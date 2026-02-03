# Current Work Focus

## Project Status: Early Development Phase

The F.O.C.U.S. Clinical application is in the initial development stage with core infrastructure established.

## Recent Changes

1. **Electron Application Framework Established**
   - Main process with timing validation using `process.hrtime.bigint()`
   - SQLite database with secure query whitelist pattern
   - IPC handlers for timing events and database operations
   - Preload script with context bridge for secure renderer access

2. **React UI Foundation**
   - Basic DebugScreen component for timing event capture
   - Tailwind CSS v4 integration via Vite plugin
   - Event handlers for mouse click and keyboard input

3. **Build System Configuration**
   - Vite + TypeScript + Electron build pipeline configured
   - Platform-specific build targets (Windows NSIS, macOS DMG, Linux AppImage)

## Next Steps

1. **Implement Test Protocol**
   - 21.6-minute visual test with alternating stimuli
   - Stimulus presentation with high-precision timing
   - Response capture and metric calculation

2. **Backend Integration**
   - N8N webhook for result submission
   - SuperTokens authentication integration
   - FHIR resource creation for patient reports

3. **User Experience**
   - Patient email capture form
   - Result submission workflow
   - Magic link email delivery

## Known Gaps

- No N8N webhook integration implemented
- No SuperTokens authentication
- No FHIR healthcare data integration
- No test protocol (stimulus presentation, response tracking)
- No email capture form
- No normative data comparison
- No result processing workflow

## Source Code Paths

- Main process: `src/main/main.ts`
- Preload script: `src/preload/preload.ts`
- React UI: `src/renderer/App.tsx`, `src/renderer/DebugScreen.tsx`
- Configuration: `vite.config.mjs`, `package.json`
