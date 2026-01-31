# TOVA ADHD Test - Local Electron Application

Building a desktop application that implements the T.O.V.A. (Test of Variables of Attention) visual assessment for ADHD evaluation in clinical settings.

Core requirements:

- Achieve millisecond-precision timing (±1ms) for stimulus presentation and response capture
- Run entirely client-side during test execution to minimize server dependency
- Support visual test protocol: 21.6 minutes duration with two alternating stimuli
- Measure four key attention variables: Response Time Variability, Response Time, Commission Errors, Omission Errors
- Capture patient email after test completion for result delivery
- Integrate with existing authentication system (SuperTokens) and FHIR healthcare data standards
- Submit raw test data to serverless N8N workflow for processing against normative samples
- Deploy as cross-platform desktop application (Windows, macOS, Linux, BSD-compatible)
- Enable installation on multiple workstations within healthcare facilities
- Store test data locally and securely until successful server transmission
- Provide patients access to processed results via magic link email delivery

Critical success factors:

- Timing precision must match or approach clinical-grade T.O.V.A. hardware (±1ms)
- Zero network dependency during active testing to ensure reliability
- Simple deployment process for non-technical healthcare staff
- Data integrity and HIPAA compliance throughout the workflow
- Minimal ongoing infrastructure costs through serverless architecture
