# Current Work Focus

## Project Status: Feature Complete Core Application with Modular Architecture

The F.O.C.U.S. Assessment application has reached feature completion for the core client application with a fully modularized test engine. All test execution, timing precision, metrics calculation, and results display are implemented using a clean separation of concerns.

## Recent Changes

### Test Engine Modular Refactoring (Completed)

The test-engine.ts file has been completely refactored from a 431-line monolithic file into 4 modular components with clear responsibilities:

**Before (Monolithic Architecture):**
- Single file `src/main/test-engine.ts` (431 lines)
- Mixed responsibilities: state, timing, sequence generation, response tracking, event emission
- Module-level mutable state scattered throughout

**After (Modular Architecture):**

1. **TrialScheduler Class** (`src/main/trial-scheduler.ts`):
   - Encapsulates all timing state
   - Implements drift-corrected scheduling algorithm
   - Manages trial state transitions
   - Emits stimulus-change events via callback

2. **TrialSequenceGenerator Module** (`src/main/trial-sequence.ts`):
   - Pure functions for sequence generation
   - `shuffleArray<T>()` - Fisher-Yates shuffle
   - `generateTrialSequence()` - Two-half ratio generation
   - Interface for dependency injection

3. **ResponseTracker Class** (`src/main/response-tracker.ts`):
   - Manages pending response windows
   - Validates responses against stimulus onset
   - Detects anticipatory responses (configurable threshold)
   - Tracks commission/omission errors
   - Handles multiple responses per trial

4. **TestEngine** (`src/main/test-engine.ts`):
   - Reduced to orchestrator role only
   - Creates and coordinates TrialScheduler and ResponseTracker
   - Maintains public API (`startTest`, `stopTest`, `recordResponse`, etc.)
   - Owns window reference for event emission

### Bug Fix: Response Tracking (Completed)

During the refactoring, a critical bug was discovered and fixed:

**Issue:** Clicks on target stimuli were not being recorded as hits. Instead, responses were incorrectly matched to previous non-target trials.

**Root Cause:** In `test-engine.ts`, the code used `pendingResponses[0]` (oldest pending trial) instead of the correct trial matching the current stimulus.

**Fix Applied:** Changed to `pendingResponses[pendingResponses.length - 1]` to correctly match responses to the most recent pending stimulus.

**Result:**
- Before fix: 3 targets → 1 hit, 2 omissions (incorrect)
- After fix: 3 targets → 3 hits, 0 omissions (correct)

### Bug Fix: Response Validation Timing (Completed)

**Issue:** Response validation used only `interstimulusIntervalMs` instead of the full response window (`stimulusDurationMs + interstimulusIntervalMs`). This could cause valid responses during long stimuli to be flagged as commission errors.

**Root Cause:** In `response-tracker.ts`, the `processResponse` method validated responses against `interstimulusIntervalMs` only, which fails when `stimulusDurationMs > interstimulusIntervalMs`.

**Fix Applied:** Changed validation to use `stimulusDurationMs + interstimulusIntervalMs` as the full response window, ensuring correct behavior for all configuration values.

**Result:**
- Valid responses are now correctly recognized regardless of stimulus duration
- Extended stimulus configurations work correctly

### Unit Testing Implementation (Completed)

Comprehensive unit tests have been implemented using Vitest to validate attention metric calculations against TOVA manual specifications:

**Test Coverage:**
- `src/renderer/utils/attention-metrics.test.ts` (644 lines)
- Tests validate D Prime, variability, and ACS calculations
- Uses TOVA-compliant Abramowitz & Stegun inverse CDF formula
- Floating-point comparisons with `toBeCloseTo()` for precision

**Key Test Suites:**
- Mean and variability calculations
- D Prime signal detection metric
- Z-score normalization
- ACS scoring integration
- Anticipatory response exclusion
- D Prime sign convention validation

**Test Data:**
- Real test data loaded from `data/test-data.json`
- Tests validate against manual TOVA calculations
- Boundary conditions for 0% and 100% hit/false alarm rates

### Test Engine & Timing (Completed)
- High-precision test engine with `process.hrtime.bigint()` nanosecond timestamps
- Drift-corrected stimulus scheduling for timing accuracy
- Response capture with anticipatory detection (<150ms threshold)
- Trial state machine with buffer, countdown, running, and completed phases

### Database & Security (Completed)
- SQLCipher 256-bit AES encryption for data at rest
- Encryption key generation and secure storage in userData
- Database migration from unencrypted to encrypted format
- GDPR-compliant 7-day automatic data retention
- Consent-based data collection with email capture

### UI Components (Completed)
- Full-screen TestScreen with test phase management
- StimulusContainer for target/non-target stimulus rendering
- Test components: TestHeader, CountdownDisplay, BufferDisplay, TrialProgress
- Results components: ResultsSummary, AcsScoreCard, TrialOutcomesGrid, ResponseStatsGrid, ZScoresGrid, ValidityWarning, TestInfo
- Email capture form with consent checkbox

### Metrics & Normative Data (Completed)
- Attention metrics calculation (hits, commissions, omissions, correct rejections)
- ACS (Attention Comparison Score) with Z-score normalization
- Proportional scaling for abbreviated tests
- D Prime signal detection metric
- Validity assessment with anticipatory response detection
- Normative reference data for ages 4-80+ by gender

### Build Optimization (Completed)
- Removed container from Linux build job (git pre-installed on ubuntu-latest)
- Added Electron Builder cache to `electron-build-linux/action.yml`
- Added native module build cache to `electron-build-common/action.yml`
- Expected build time reduction: ~1-2 minutes on cache hits

### IPC Communication (Completed)
- Test control IPC handlers (start-test, stop-test, record-response)
- Event emission for stimulus changes and test completion
- Database query whitelist pattern (no raw SQL from renderer)
- Test config get/set/reset handlers

## Next Steps

### Backend Integration (Priority)
1. **N8N Webhook Integration**
   - Configure N8N_WEBHOOK_URL environment variable
   - Implement NetworkManager for HTTPS POST with retry logic
   - Handle upload status and retry on app launch

2. **SuperTokens Authentication**
   - Configure SUPERTOKENS_API_URL and SUPERTOKENS_API_KEY
   - Implement user verification in result submission
   - Associate test results with user accounts

### Healthcare Integration (Future)
3. **FHIR Resource Creation**
   - Create DiagnosticReport resources for test results
   - Create Observation resources for individual metrics
   - Integrate with HAPI FHIR server

4. **Magic Link Email Delivery**
   - Generate JWT tokens for result access
   - Integrate SendGrid/SMTP for email delivery
   - Implement token expiration and validation

## Known Gaps

- No N8N webhook integration implemented (endpoint URL not configured)
- No SuperTokens authentication (API credentials not configured)
- No FHIR healthcare data integration
- No magic link email delivery

## Source Code Paths

### Main Process (Test Engine)
- Test engine orchestrator: `src/main/test-engine.ts`
- Trial timing: `src/main/trial-scheduler.ts`
- Sequence generation: `src/main/trial-sequence.ts`
- Response validation: `src/main/response-tracker.ts`
- High-precision timing: `src/main/timing.ts`
- IPC handlers: `src/main/ipc-handlers.ts`
- Database: `src/main/database.ts`
- Types: `src/main/types.ts`

### Preload & Window
- Preload script: `src/preload/preload.ts`
- Window management: `src/main/window.ts`

### React UI
- Main app: `src/renderer/App.tsx`
- Test screen: `src/renderer/TestScreen.tsx`
- Test hooks: `src/renderer/hooks/useTestEvents.ts`, `src/renderer/hooks/useTestPhase.ts`, `src/renderer/hooks/useTestInput.ts`, `src/renderer/hooks/useAttentionMetrics.ts`
- Results components: `src/renderer/components/Results/`
- Stimulus components: `src/renderer/components/Stimulus/`
- Test components: `src/renderer/components/Test/`

### Metrics & Calculation Utilities
- Attention metrics calculation: `src/renderer/utils/attention-metrics.ts`
- Shared ACS calculation: `src/renderer/utils/acs-shared.ts`
- Basic statistics: `src/renderer/utils/basic-stats.ts`
- Clinical metrics (D Prime): `src/renderer/utils/clinical-metrics.ts`
- Trial processing: `src/renderer/utils/trial-processing.ts`
- Normative data: `src/renderer/utils/normative-data.ts`
- Trial constants: `src/renderer/utils/trial-constants.ts`

### Unit Tests
- Attention metrics tests: `src/renderer/utils/attention-metrics.test.ts`
- Test data: `data/test-data.json`

### Configuration & Build
- Vite config: `vite.config.mjs`
- Package: `package.json`
- Vitest config: `vitest.config.ts`
- Plans: `plans/test-engine-refactoring-plan.md`
