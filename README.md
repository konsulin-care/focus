<p align="center" style="padding-top:20px">
 <img width="100px" src="https://github.com/konsulin-care/landing-page/raw/main/assets/images/global/logo.svg" align="center" alt="GitHub Readme Stats" />
 <h1 align="center">F.O.C.U.S. Assessment</h1>
 <p align="center">Following Ongoing Cues Under Structure</p>
</p>

<p align="center">
  <a href="https://deepwiki.com/konsulin-care/focus"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  <a href="https://deepscan.io/dashboard#view=project&tid=28882&pid=31014&bid=1002029"><img src="https://deepscan.io/api/teams/28882/projects/31014/branches/1002029/badge/grade.svg" alt="DeepScan Grade"></a>
  <a href="https://app.codacy.com/gh/konsulin-care/focus/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade"><img src="https://app.codacy.com/project/badge/Grade/6f5f812b545c429eb623aadcf77e091f" alt="Code Quality"></a>
  <a href="https://app.deepsource.com/gh/konsulin-care/focus/"><img alt="DeepSource" title="DeepSource" src="https://app.deepsource.com/gh/konsulin-care/focus.svg/?label=active+issues&show_trend=false"/></a>
</p>

# F.O.C.U.S. Assessment Application

F.O.C.U.S. is a visual attention assessment tool built on Electron, designed for measuring attention metrics in research and educational settings.

## About This Application

The F.O.C.U.S. Assessment is a computerized visual test that measures attention through a structured protocol of alternating target and non-target stimuli. Participants respond to target stimuli by pressing a key or clicking, and the system captures response timing, accuracy, and variability.

### Core Features

- **High-Precision Timing**: Uses Node.js `process.hrtime.bigint()` for sub-millisecond timestamp capture on the CPU level
- **648-Trial Protocol**: Standardized test with alternating stimuli over approximately 21.6 minutes
- **Attention Metrics**: Measures response time, response variability, commission errors, omission errors, and signal detection (d-prime)
- **ACS Scoring**: Attention Comparison Score with Z-score normalization against age/gender normative data
- **Local Data Storage**: Encrypted SQLite database with GDPR-compliant 7-day retention
- **Cross-Platform**: Windows, macOS, and Linux support

## Intended Use

### Research and Educational Use

This application is well-suited for:
- Academic research studies on attention
- Educational psychology experiments
- Cognitive science investigations
- Screening in non-clinical settings
- Training and practice assessments

The application provides precise timing measurements and standardized protocols that make it appropriate for research purposes where the focus is on relative comparisons and group-level analysis.

### Limitations for Clinical Practice

**This application is NOT designed for clinical diagnosis or medical decision-making.** Key limitations include:

1. **Monitor-Dependent Temporal Accuracy**: Stimulus presentation timing varies based on display technology (see timing accuracy table below)
2. **No FDA/Medical Device Clearance**: Not certified as a medical device
3. **Normative Data Limitations**: Reference data may not represent all populations
4. **No Healthcare Integration**: Current version lacks FHIR compatibility and EMR integration
5. **No Quality Assurance Protocol**: No calibration verification or drift detection

Clinical attention assessments require specialized hardware and validated medical devices that meet regulatory standards.

## Timing Accuracy

### CPU-Level Precision

The application captures timestamps using `process.hrtime.bigint()`, which provides nanosecond-resolution timing from the CPU's high-performance counter. This ensures consistent temporal ordering of events within the application.

### Monitor-Dependent Presentation Accuracy

The actual time when the visual change appears on screen depends heavily on display technology. The following table compares expected temporal accuracy for different monitor types:

| Display Type | Typical Latency | Refresh Rate | Expected Accuracy | Notes |
|--------------|-----------------|--------------|-------------------|-------|
| **CRT** | 1-3 ms | 60-120 Hz | ±2-5 ms | Analog display with near-instant response; gold standard for timing research |
| **LCD** | 5-15 ms | 60-144 Hz | ±8-20 ms | Response time varies by pixel transition; common in older displays |
| **LED** | 1-8 ms | 60-240 Hz | ±3-12 ms | Backlight technology; lower latency than CCFL LCD |
| **OLED** | 0.1-1 ms | 60-120 Hz | ±1-3 ms | Individual pixel illumination; excellent for timing-critical applications |
| **QLED** | 2-10 ms | 60-144 Hz | ±4-15 ms | Quantum dot enhancement; similar to LED latency characteristics |

### Why Monitor Timing Matters

Even with perfect CPU-level timestamp capture, the actual visual stimulus appears on screen according to the display's refresh cycle and response characteristics. For research requiring precise temporal alignment, consider:

- Using OLED or high-refresh-rate LED displays
- Measuring end-to-end latency with a photodiode
- Synchronizing with external stimulus presentation systems
- Documenting display specifications in research publications

## Konsulin Ecosystem Integration

This application is a component of the **Konsulin Integrated Health Record Ecosystem**, a modular platform designed to provide healthcare facilities with flexible, standards-based clinical tools.

### Architecture Philosophy

The Konsulin ecosystem emphasizes:
- **Modularity**: Standalone tools that work independently or as part of the ecosystem
- **Standards Compliance**: FHIR, HL7, and healthcare interoperability standards
- **Privacy-First Design**: Local data processing with user consent
- **Research Accessibility**: Tools available for academic use without licensing barriers

## Getting Started

### System Requirements

- **Node.js >=24.0** and npm 11+ (managed via mise for reproducibility)
- Platform-specific build tools (Xcode, Visual Studio, or build-essential)
- 4GB RAM minimum, 8GB recommended
- Any display supported by the operating system

### Installation

For `mise` installation and activation, [refer to the project documentation](https://mise.jdx.dev/getting-started.html).

```bash
# Clone the repository
git clone https://github.com/konsulin-care/focus.git
cd focus

# Install dependencies using mise-managed Node.js
mise install  # Installs tools from mise.lock
```

At this point, you can check whether the installed tools are available in your environment, e.g., the command `mise where node` and `which node` should return the same path.

```
# Rebuild native modules for Electron
npm run electron-rebuild

# Build the project
npm run build

# Start development mode
npm run dev
```

### Building for Production

```bash
# Build for current platform
npm run build:platform

# Platform-specific builds
npm run build:win    # Windows portable app
npm run build:mac    # macOS DMG package
npm run build:linux  # Linux AppImage
```

## Support

For questions about research applications or ecosystem integration:
- GitHub Issues for bug reports and feature requests
- Documentation for technical questions
- Contact [hello@konsulin.care](mailto:hello@konsulin.care) for enterprise support options

---

**Disclaimer**: This software is provided for research and educational purposes only. It is not a medical device and should not be used for clinical diagnosis, treatment decisions, or any healthcare-related activities requiring regulatory clearance.
