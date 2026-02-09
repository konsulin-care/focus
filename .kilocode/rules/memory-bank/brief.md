# F.O.C.U.S. Assessment - Local Electron Application

Building a desktop application that implements the F.O.C.U.S. (Following Ongoing Cues Under Structure) visual assessment for visual attention evaluation in clinical settings.

## Core Requirements

### Implemented Features
- Millisecond-precision timing (±1ms) using Node.js `process.hrtime.bigint()`
- Client-side test execution with no network dependency during testing
- 21.6-minute visual test protocol with 648 trials and two alternating stimuli
- Four key attention variables measured: Response Time Variability, Response Time, Commission Errors, Omission Errors
- Patient email capture after test completion
- SQLCipher encrypted local SQLite database with GDPR-compliant 7-day retention
- Cross-platform desktop application (Windows NSIS, macOS DMG, Linux AppImage)
- Test data stored locally until server transmission
- Attention Comparison Score (ACS) with normative data comparison
- Signal detection metrics (D Prime, hit rate, false alarm rate)
- Validity assessment with anticipatory response detection
- Multi-language support (English, Indonesian) with i18next
- Home, About, and Settings pages with sidebar navigation
- Configurable test parameters (stimulus duration, ISI, trial count, buffer)
- Detailed ACS calculation modal with step-by-step breakdown
- Unit testing with Vitest for attention metrics validation

### Partially Implemented
- N8N webhook integration for result submission (structure exists, needs endpoint URL)
- SuperTokens authentication integration (IPC handlers exist, needs API credentials)

### Not Yet Implemented
- FHIR healthcare data integration
- Magic link email delivery

## Critical Success Factors

- Timing precision must match or approach clinical-grade F.O.C.U.S. hardware (±1ms)
- Zero network dependency during active testing to ensure reliability
- Simple deployment process for non-technical healthcare staff
- Data integrity and HIPAA/GDPR compliance throughout the workflow
- Minimal ongoing infrastructure costs through serverless architecture
- Support for abbreviated tests (proportional scaling for shorter tests)
- Multi-language support for international deployment
