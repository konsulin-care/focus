# CI/CD Pipeline for F.O.C.U.S. Attention App

This document explains how the GitHub Actions CI/CD pipeline works for building and releasing the F.O.C.U.S. Attention Electron application.

## Overview

The pipeline automatically builds and packages the Electron application for three platforms:
- **Linux** → AppImage
- **macOS** → DMG
- **Windows** → Portable EXE

## Trigger Conditions

The workflow triggers on **merged pull requests to master** that include a version tag.

**Requirements**:
1. PR must be merged to master branch
2. Version tag (`v*.*.*`) must exist in PR and be present on merge commit
3. Pull request must have `closed` type with `merged: true`

```yaml
on:
  pull_request:
    branches:
      - master
    types:
      - closed
```

## Workflow Structure

The workflow uses a matrix strategy to build all platforms from a single `build` job. Platform-specific logic is handled by the `electron-build-platform` composite action.

```mermaid
flowchart TD
    A[prepare Job<br/>Extract version] -->|version, is_release| B[build Job<br/>Matrix: linux, macos, windows]
    
    B -->|artifact| C[create-release Job<br/>tagged releases only]
    B -->|artifact| D[summary Job<br/>always runs]
    C --> D
    
    subgraph Build Matrix
    B
    end
    
    subgraph Final Jobs
    C
    D
    end
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e9
    style D fill:#fff3e0
```

## Jobs

### 1. prepare

**Purpose**: Extract version information and validate the build environment.

**Outputs**:
- `version`: Semantic version string (e.g., "1.0.0")
- `is_release`: `true` for tagged releases, `false` for other builds

**Steps**:
1. Checkout repository
2. Extract version from git tag (removes `v` prefix)
3. Validate version format (X.Y.Z)
4. Display build information

### 2. build (Matrix Job)

**Purpose**: Build Electron app for all platforms using a matrix strategy.

**Runner**: Varies by platform (ubuntu-latest, macos-latest, windows-latest)

**Steps**:
1. Checkout repository
2. Run `electron-build-common` action (npm install, native module rebuild)
3. Run `electron-build-platform` action with platform parameter:
   - Linux: Install system deps, build AppImage, generate SHA256, upload
   - macOS: Build DMG, generate SHA256, upload
   - Windows: Build portable EXE, generate SHA256, upload
4. Upload artifact (7-day retention)

### 3. create-release (Tagged Releases Only)

**Purpose**: Create GitHub release with all artifacts.

**Runs**: Only when `is_release == true`

**Steps**:
1. Download all platform artifacts
2. Flatten artifact directory structure
3. Create GitHub release with release notes
4. Attach all build artifacts
5. Include installation instructions

### 4. summary

**Purpose**: Display build summary in GitHub Actions UI.

**Runs**: Always (even on failure)

**Output**:
- Version information
- Build status for each platform
- List of generated artifacts

## Artifact Naming

All artifacts follow the naming convention: `focus-{version}.{ext}`

| Platform | Extension | Example |
|----------|-----------|---------|
| Linux | .AppImage | focusv1.0.0.AppImage |
| macOS | .dmg | focus-1.0.0.dmg |
| Windows | .exe | focus-1.0.0.exe |

Each artifact also includes a SHA256 checksum file: `{artifact}.sha256sum`

## Security

### Code Signing

The workflow includes placeholders for code signing certificates:

```yaml
# macOS
CSC_LINK: ${{ secrets.MACOS_CERTIFICATE }}
CSC_KEY_PASSWORD: ${{ secrets.MACOS_CERTIFICATE_PASSWORD }}

# Windows
CSC_LINK: ${{ secrets.WINDOWS_CERTIFICATE }}
CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
```

**Secrets required** (configure in GitHub repository settings):
- `MACOS_CERTIFICATE` - Apple Developer ID certificate (base64)
- `MACOS_CERTIFICATE_PASSWORD` - Certificate password
- `WINDOWS_CERTIFICATE` - Windows code signing certificate (base64)
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

### Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

This prevents concurrent builds for the same PR and cancels in-progress builds when a new commit is pushed to the PR.

## Caching

The workflow uses:
- **npm cache** - Speeds up dependency installation
- **GitHub Actions artifact storage** - 7-day retention

## Testing the Pipeline

### 1. Create a test tag

```bash
git tag v0.0.1-test
git push origin v0.0.1-test
```

### 2. Monitor the build

1. Go to your repository's **Actions** tab
2. Watch the "Build and Release Electron App" workflow
3. Check each job's logs for errors

### 3. Verify artifacts

After builds complete:
1. Download artifacts from the workflow run
2. Verify SHA256 checksums
3. Test installation on each platform

### 4. Cleanup

```bash
git tag -d v0.0.1-test
git push origin :refs/tags/v0.0.1-test
```

## Troubleshooting

### Native Module Build Failures

Ensure `npm run electron-rebuild` runs successfully:
```bash
# Locally
npm run electron-rebuild
```

### Windows Build Issues

Verify Wine installation:
```bash
wine64 --version
```

### Artifact Upload Failures

Check file size limits (GitHub limits 2GB per artifact).

### Version Extraction Fails

Ensure tags follow semantic versioning:
- Must match pattern `vX.Y.Z` (e.g., `v1.0.0`, `v2.3.4`)
- No pre-release suffixes (use `v1.0.0-rc1` for release candidates)

## Configuration Files

### Workflow File

`.github/workflows/build-and-release.yml` - Main CI/CD pipeline

### Composite Actions

| File | Purpose |
|------|---------|
| `.github/actions/extract-version/action.yml` | Extract version from git commits |
| `.github/actions/electron-build-common/action.yml` | Shared build setup (npm, cache, native modules) |
| `.github/actions/electron-build-platform/action.yml` | Platform-specific build (linux/macos/windows) |
| `.github/actions/prepare-release/action.yml` | Create GitHub release with artifacts |

### Application Build Config

`package.json` - electron-builder configuration:

```json
{
  "build": {
    "appId": "com.konsulin.focus",
    "productName": "F.O.C.U.S. Attention",
    "directories": {
      "output": "release"
    }
  }
}
```

## Production Release Checklist

Before creating a production release:

- [ ] All tests pass locally
- [ ] Code reviewed and merged to master
- [ ] Version bump in `package.json`
- [ ] Changelog updated
- [ ] Git tag created with semantic version
- [ ] Tag pushed to trigger workflow
- [ ] All platform builds complete successfully
- [ ] Artifacts tested on each platform
- [ ] GitHub release created and published

## Support

For issues or questions:
- Check workflow run logs in GitHub Actions
- Verify all secrets are configured
- Test builds locally before pushing tags
