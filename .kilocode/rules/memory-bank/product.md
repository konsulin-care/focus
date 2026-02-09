# Problem Statement

Healthcare facilities need a reliable, cost-effective way to administer F.O.C.U.S. attention assessments without expensive proprietary hardware or complex IT infrastructure.

Current challenges:

- Clinical attention tests require specialized hardware and high licensing costs
- Web-based alternatives cannot achieve required timing precision due to browser limitations
- Server-dependent systems introduce latency and reliability issues during testing
- Healthcare facilities have limited IT resources for complex deployments
- Patient data must remain secure and compliant with healthcare regulations

# How the Product Works

Patient Experience:

- Patient sits at clinic workstation with installed F.O.C.U.S. application
- Healthcare staff launches application and instructs patient
- Visual test runs for 21.6 minutes presenting two alternating square stimuli
- Patient presses button/key when target stimulus appears
- After completion, patient enters their email address and age/gender
- Results calculated immediately with ACS score and normative comparison
- Patient receives magic link via email to access their processed results (future)

Clinical Staff Experience:

- Install application on clinic workstations (one-time setup)
- Launch application for each patient assessment
- No configuration or management needed during test
- Results automatically processed and stored locally
- Access patient reports through application (future: FHIR integration)

Technical Flow:

- Application runs test entirely locally using high-precision timers
- Captures response times, commissions, and omissions with sub-millisecond accuracy
- Stores raw data in encrypted local SQLite database
- On completion, calculates metrics against normative samples
- Displays results immediately to patient
- (Future) On email submission, transmits raw test data to N8N serverless webhook
- (Future) N8N workflow processes data, generates FHIR report, sends magic link

User Experience Goals:

- Test runs smoothly without interruption or technical issues
- Patient interface is simple and not intimidating
- No waiting for network operations during test execution
- Results delivered immediately via application display
- Healthcare staff spend minimal time on technical operations
- Installation and updates are straightforward

Why This Approach:

- Electron enables desktop-class timing precision impossible in browsers
- Local execution eliminates network-related failures during critical testing
- Serverless backend minimizes infrastructure costs and maintenance (future)
- Standards-based integration (FHIR, SuperTokens) enables ecosystem compatibility (future)
- Cross-platform support maximizes deployment flexibility

# Completed Features

## Test Protocol Implementation
- 648 trials over 21.6 minutes
- Alternating target/non-target stimuli
- 100ms stimulus duration, 2000ms interstimulus interval
- Drift-corrected timing scheduler
- Buffer period before first stimulus

## Response Tracking
- Keyboard (spacebar) and mouse click responses
- Anticipatory response detection (<150ms)
- Multiple response detection per trial
- Response time calculation from stimulus onset

## Attention Metrics
- Response Time Variability (coefficient of variation)
- Mean Response Time
- Commission Error rate
- Omission Error rate
- D Prime (signal detection sensitivity)

## ACS Scoring System
- Z-score normalization against age/gender normative data
- Proportional scaling for abbreviated tests
- Three-tier interpretation: Normal, Borderline, Not Within Normal Limits

## Normative Reference Data
- Age ranges: 4-19 (single year), 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80+
- Gender breakdown: Male, Female
- Sample sizes per group (n values)

## Database & Security
- SQLCipher encrypted database (256-bit AES)
- GDPR-compliant 7-day automatic data retention
- Consent-based data collection
- Email validation before storage

## User Interface
- Full-screen test presentation
- Real-time stimulus rendering
- Trial progress indicator
- Results summary with ACS card
- Trial outcomes grid
- Response statistics
- Z-scores display
- Validity warnings

## Testing & Validation
- Unit tests with Vitest for attention metrics calculations
- Tests validate against TOVA manual specifications
- D Prime signal detection validation
- Z-score normalization verification
- Anticipatory response exclusion tests

# Future Enhancements

- N8N webhook integration for backend processing
- SuperTokens authentication
- FHIR healthcare data integration
- Magic link email delivery
- Extended normative database
- Multi-language support
