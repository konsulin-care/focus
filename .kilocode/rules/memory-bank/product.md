# Problem Statement

Healthcare facilities need a reliable, cost-effective way to administer T.O.V.A. ADHD assessments without expensive proprietary hardware or complex IT infrastructure.

Current challenges:

- Clinical T.O.V.A. systems require specialized hardware and high licensing costs
- Web-based alternatives cannot achieve required timing precision due to browser limitations
- Server-dependent systems introduce latency and reliability issues during testing
- Healthcare facilities have limited IT resources for complex deployments
- Patient data must remain secure and compliant with healthcare regulations

# How the Product Works

Patient Experience:

- Patient sits at clinic workstation with installed TOVA application
- Healthcare staff launches application and instructs patient
- Visual test runs for 21.6 minutes presenting two alternating square stimuli
- Patient presses button/key when target stimulus appears
- After completion, patient enters their email address
- Patient receives magic link via email to access their processed results

Clinical Staff Experience:

- Install application on clinic workstations (one-time setup)
- Launch application for each patient assessment
- No configuration or management needed during test
- Results automatically processed and stored in FHIR system
- Access patient reports through existing clinical systems

Technical Flow:

- Application runs test entirely locally using high-precision timers
- Captures response times, commissions, and omissions with sub-millisecond accuracy
- Stores raw data in encrypted local SQLite database
- On completion, transmits raw test data plus email address to N8N serverless webhook
- N8N workflow processes data against normative samples, generates report
- Report stored in FHIR server and magic link sent to patient email
- Local data deleted after successful transmission

User Experience Goals:

- Test runs smoothly without interruption or technical issues
- Patient interface is simple and not intimidating
- No waiting for network operations during test execution
- Results delivered quickly via familiar email mechanism
- Healthcare staff spend minimal time on technical operations
- Installation and updates are straightforward

Why This Approach:

- Electron enables desktop-class timing precision impossible in browsers
- Local execution eliminates network-related failures during critical testing
- Serverless backend minimizes infrastructure costs and maintenance
- Standards-based integration (FHIR, SuperTokens) enables ecosystem compatibility
- Cross-platform support maximizes deployment flexibility
