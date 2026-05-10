# Admin Authentication System

Comprehensive documentation for the F.O.C.U.S. application's admin authentication system, covering security architecture, setup procedures, recovery flows, and deployment configuration.

---

## Table of Contents

1. [Security Architecture Overview](#1-security-architecture-overview)
2. [Recovery Process (User-Facing)](#2-recovery-process-user-facing)
3. [Admin Setup Guide](#3-admin-setup-guide)
4. [Troubleshooting](#4-troubleshooting)
5. [N8N Webhook Specification](#5-n8n-webhook-specification)
6. [Deployment Checklist](#6-deployment-checklist)

---

## 1. Security Architecture Overview

The admin authentication system uses a **three-layer security model** combining password hashing, device-bound encryption, and email-verified recovery. All privileged operations are owned by the Electron main process; the renderer has no direct filesystem or cryptographic access.

### Layer 1: Bcrypt Password Hashing

User passwords are hashed with **bcrypt** using a cost factor of **12** before storage in the SQLite database.

| Aspect | Detail |
|---|---|
| Algorithm | bcrypt (via `bcryptjs`) |
| Cost factor | 12 |
| Storage location | `test_config` table, key `admin_password_hash` |
| Comparison | Synchronous (`bcrypt.compareSync`) to avoid race conditions in Electron's single-threaded main process |

**Why bcrypt?** Bcrypt is deliberately slow and salted, making brute-force and rainbow-table attacks impractical even if the database is extracted.

### Layer 2: LMK-Based Encryption (AES-256-GCM)

All sensitive non-password data — the admin's email address and the recovery key — is encrypted at rest using **AES-256-GCM** with a **Local Master Key (LMK)**.

#### How the LMK works

1. **Generation**: On first run, a 32-byte random key is generated and stored in the OS-native keychain via the `keytar` library under service `focus-auth` and account `local-master-key`.
2. **Retrieval**: On subsequent launches, `keytar.getPassword('focus-auth', 'local-master-key')` retrieves the existing key. If the keychain entry is missing, a fresh key is generated and stored.
3. **Usage**: The LMK is used as the AES-256-GCM symmetric key for all encryption operations in `key-management.ts`.

```
┌─────────────────────────────────────────────────────────┐
│                    OS Keychain                           │
│  Service: focus-auth                                    │
│  Account: local-master-key                              │
│  → 32-byte LMK (hex) ──────────────────────────────────┐
└─────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
                    ┌──────────────────────────────────────────┐
                    │         AES-256-GCM Encryption            │
                    │                                          │
                    │  Input: plaintext + LMK → ciphertext +   │
                    │         IV (12 bytes) + auth tag         │
                    │                                          │
                    │  Stored in SQLite (base64-encoded):      │
                    │    admin_email_ciphertext, admin_email_iv,│
                    │    admin_email_tag, recovery_ciphertext, │
                    │    recovery_iv, recovery_tag              │
                    └──────────────────────────────────────────┘
```

**Why AES-GCM?** GCM mode provides both confidentiality and integrity via its authentication tag. Any tampering with ciphertext, IV, or tag causes decryption to fail.

### Layer 3: Email Recovery with Device Binding

The recovery system ties password reset capability to both a **registered email** and the **original device**.

1. **Email registration**: During admin setup, the user provides an email address. The email is encrypted with the LMK and stored in the database.
2. **Device UUID**: A unique device identifier (`device_uuid`) is generated on first run and stored in the database. This UUID is checked during recovery to ensure the request originates from the same machine.
3. **Recovery key**: A 32-byte cryptographically random key (`randomBytes(32)`) is generated, encrypted with the LMK, and displayed to the user **one time** during setup. This key is the user's proof of identity for recovery.

#### Machine-binding via device UUID

The device UUID serves as a machine-bound salt in key derivation and as the session identifier. During recovery:

- The provided email is decrypted with the LMK and compared to the user-supplied email.
- The current device's UUID is compared against the stored `admin_device_uuid`.
- If either check fails, recovery is rejected with a clear error message.

This prevents recovery from a different machine, even if the attacker has access to the encrypted database.

### Component Map

| File | Responsibility |
|---|---|
| `src/main/auth.ts` | Registration, login, session management, recovery flow, `requireAdmin` guard |
| `src/main/key-management.ts` | LMK retrieval, AES-256-GCM encrypt/decrypt, device UUID management |
| `src/main/generated-config.ts` | Build-time injected webhook URL and secret (auto-generated, never committed) |
| `src/main/config.ts` | Runtime configuration with environment variable fallbacks |
| `src/preload/preload.ts` | Context bridge exposing safe `auth*` IPC methods to the renderer |

### IPC Security Model

The renderer process **cannot** access the filesystem, keychain, or database directly. All authentication operations go through the preload context bridge:

| Renderer API | IPC Channel | Main Process Function |
|---|---|---|
| `electronAPI.authIsSetup()` | `admin-is-setup` | `isAdminSetup()` |
| `electronAPI.authRegister(email, password)` | `admin-register` | `registerAdmin()` |
| `electronAPI.authLogin(password)` | `admin-login` | `loginAdmin(password)` |
| `electronAPI.authLogout()` | `admin-logout` | `logoutSession()` |
| `electronAPI.authVerifySession(token)` | `admin-verify-session` | `verifySession()` |
| `electronAPI.authRequestRecovery(email)` | `admin-request-recovery` | `requestRecovery()` |
| `electronAPI.authPerformRecovery(keyJson, newPassword)` | `admin-perform-recovery` | `performRecovery()` |
| `electronAPI.authChangePassword(current, new)` | `admin-change-password` | `changePassword()` |
| `electronAPI.authStatus()` | `auth-status` | Returns current auth state |

The `requireAdmin(event)` guard is called by protected IPC handlers to reject requests from unauthenticated senders.

---

## 2. Recovery Process (User-Facing)

### 2.1 First-Time Admin Setup

When F.O.C.U.S. starts for the first time (no admin registered), the user is prompted to create the administrator account.

**Step 1 — Enter email address**

Provide a valid email address. This will be encrypted and stored as your recovery identity.

**Step 2 — Create password**

Enter a strong password meeting the requirements listed in [Section 3.4](#34-password-requirements).

**Step 3 — Receive recovery key**

After successful registration, a **64-character hexadecimal (32‑byte) recovery key** is displayed once. This key is your only way to reset your password if you forget it.

> **CRITICAL**: Save this recovery key in a secure location (password manager, printed copy, etc.). If you lose both your password and this key, you will lose access to the application.

**Step 4 — Begin using the application**

The recovery key is shown only once during setup. After dismissing it, you can begin using F.O.C.U.S.

### 2.2 Requesting Password Recovery via Email

If you have forgotten your password:

**Step 1 — Navigate to the login screen**

Open F.O.C.U.S. and go to the admin login page.

**Step 2 — Click "Forgot Password" or "Recovery"**

This opens the recovery dialog.

**Step 3 — Enter your registered email address**

Type the exact email you provided during admin setup. The system will:

1. Decrypt the stored email using the LMK from your keychain.
2. Compare it (case-insensitive) to your input.
3. Verify the current device UUID matches the stored device UUID.
4. If both checks pass, a recovery webhook is fired to the configured N8N endpoint with your encrypted recovery key.

**Step 4 — Check your email**

The N8N workflow sends you an email containing:
- Your encrypted recovery key (ciphertext, IV, and auth tag as a JSON object)
- Instructions for the next step

**Step 5 — Return to the app and enter the recovery key**

Copy the JSON payload from the email and paste it into the recovery key field.

### 2.3 Using the Recovery Key to Reset Password

**Step 1 — Paste the encrypted recovery key**

The recovery key arrives as a JSON object:

```json
{
  "c": "<hex-encoded ciphertext>",
  "iv": "<hex-encoded 12-byte IV>",
  "tag": "<hex-encoded GCM auth tag>"
}
```

**Step 2 — Enter a new password**

Type your new password, meeting the same requirements as initial setup.

**Step 3 — Submit**

The system will:

1. Decrypt the recovery key using the LMK from your keychain.
2. Decrypt the stored recovery key from the database and compare them.
3. If they match, hash the new password with bcrypt (cost 12) and store it.
4. Generate a **new** 32-byte recovery key, encrypt it with the LMK, and replace the old one in the database.
5. Reset the failed login counter and lockout timer.

**Step 4 — Log in with the new password**

You are now logged in with your new credentials. The new recovery key will be displayed — save it securely.

### 2.4 If the Recovery Key Is Lost

If you have lost both your password **and** the recovery key:

1. **Delete the application's SQLite database** located in the Electron `userData` directory. The `test_config` table contains admin authentication data and test results (see Appendix A for schema details). Deleting this database removes all locally stored admin credentials and test data.

2. **Delete the OS keychain entry** created by `keytar` (service: `focus-auth`, account: `local-master-key`) from macOS Keychain / Windows Credential Manager. This allows the Local Master Key (LMK) to be regenerated on next launch.

> **Warning**: Deleting the database removes all test results and admin credentials. Deleting **only** the keychain entry will **not** reset authentication because the database still holds the encrypted admin state — you must delete both the database and the keychain entry to fully reset.

---

## 3. Admin Setup Guide

### 3.1 First Run Experience

When a user launches F.O.C.U.S. for the first time:

1. The app checks the `test_config` table for the `admin_setup_complete` flag.
2. If the flag is absent or not equal to `'1'`, the admin setup screen is shown.
3. The user fills in their email and chooses a password.
4. On successful registration:
   - The password is hashed with bcrypt (cost 12).
   - The email is encrypted with the LMK.
   - A 32-byte recovery key is generated, encrypted, and displayed to the user.
   - A device UUID is generated and stored.
   - The `admin_setup_complete` flag is set to `'1'`.
5. The user is then prompted to log in with their chosen password to obtain a session token.

### 3.2 Email Registration

The email address serves as the user's recovery identity. It is:

- Validated against a basic regex pattern (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
- Encrypted with the LMK using AES-256-GCM.
- Stored as three separate fields in the `test_config` table:
  - `admin_email_ciphertext` — the encrypted email
  - `admin_email_iv` — the 12-byte initialization vector
  - `admin_email_tag` — the GCM authentication tag

The email is never stored in plaintext in the database.

### 3.3 Recovery Key Display and Importance

The recovery key is a **32-byte hexadecimal string** (64 characters) generated using `randomBytes(32)`. It is:

- **Shown only once** during initial admin registration.
- Encrypted with the LMK before storage (ciphertext, IV, and tag stored separately).
- The **only** way to perform password recovery without going through email.

**Where to save the recovery key:**
- A password manager (recommended)
- A printed copy stored in a secure location
- An encrypted file on an external drive

**Never:**
- Email the recovery key to yourself
- Store it in plain text on the same machine
- Share it with anyone

### 3.4 Password Requirements

While the system does not enforce explicit complexity rules at the bcrypt level, the following recommendations apply:

| Requirement | Recommendation |
|---|---|
| Minimum length | 12 characters |
| Character types | Mix of uppercase, lowercase, digits, and special characters |
| Uniqueness | Do not reuse passwords from other services |
| Storage | Use a password manager to avoid forgetting |

The bcrypt cost factor of 12 means each hash computation takes approximately 0.5–1 second on modern hardware, providing strong resistance against offline brute-force attacks.

---

## 4. Troubleshooting

### 4.1 Lost Recovery Key

**Symptoms**: Forgotten password with no recovery key available.

**Resolution**:
1. Uninstall and reinstall F.O.C.U.S.
2. Register a new admin account on first run.
3. The database test data is preserved; only admin credentials are reset.

**Prevention**: Save the recovery key in a password manager immediately after setup.

### 4.2 Email Not Received

**Symptoms**: Recovery email never arrives after requesting password reset.

**Possible causes and resolutions**:

| Cause | Resolution |
|---|---|
| Typo in email address | Double-check the email you entered matches the one used during setup |
| Email provider filtering | Check spam/junk folders; whitelist the sender domain |
| N8N webhook not configured | Verify `RECOVERY_WEBHOOK_URL` and `RECOVERY_WEBHOOK_SECRET` are set in the production build |
| N8N workflow misconfigured | Ensure the N8N workflow receives the webhook, decrypts the recovery key, and sends the email |
| Network issues | Check connectivity; the webhook uses a 10-second timeout |

**Debugging**: Check the Electron main process console for `[Auth] Recovery webhook failed:` error messages.

### 4.3 Account Lockout (5 Attempts, 1 Minute)

**Symptoms**: Login attempt returns the error: `"Too many failed attempts. Account locked for 1 minute"`.

**How it works**:

| Event | Behavior |
|---|---|
| 1st–4th failed attempt | `failed_login_attempts` counter increments; error: `"Invalid password"` |
| 5th failed attempt | Lockout triggered; `lockout_until` set to `Date.now() + 60000`; error: `"Too many failed attempts. Account locked for 1 minute"` |
| During lockout | All login attempts rejected with: `"Account locked. Please try again in X seconds"` (X decrements) |
| After lockout expires | Counter resets to 0; lockout cleared; fresh 5-attempt window begins |
| Successful login | Both `failed_login_attempts` and `lockout_until` reset to 0 |

**Resolution**: Wait for the lockout period to expire. Do not continue attempting login, as this wastes the remaining lockout time.

### 4.4 Session Expiry (10 Minutes Inactivity)

**Symptoms**: After a period of inactivity, the app prompts for re-authentication.

**How it works**:

| Parameter | Value |
|---|---|
| Session duration | 10 minutes (600,000 ms) |
| Storage | In-memory `Map<string, Session>` in the main process |
| Persistence | Session expiry timestamp also written to `test_config.session_expiry` |
| Extension | Each call to `verifySession()` extends the expiry by another 10 minutes |
| Key | Session token (32-byte hex string) |

**Resolution**: Log in again with your password. The session token is stored only in renderer memory and is discarded on page refresh or app restart.

### 4.5 System Sleep Handling

**Scenario**: The application is left running while the computer enters sleep/hibernate mode.

**Behavior**:
- When the system wakes, the in-memory session map is preserved (Electron main process continues running).
- However, the session's expiry timestamp may now be in the past.
- The next IPC call triggers `verifySession()`, which detects the expired session, evicts it from the map, and returns `false`.
- The renderer receives an auth error and prompts for re-login.

**Resolution**: Simply log in again. No data is lost; the session was in-memory only.

**Best practice**: For long-running assessments, ensure the system power settings do not put the machine to sleep during active testing sessions.

---

## 5. N8N Webhook Specification

The recovery system integrates with an N8N workflow via an HTTP webhook. This section describes the expected endpoint contract for developers maintaining the N8N side of the integration.

### 5.1 Webhook Endpoint Configuration

| Setting | Value |
|---|---|
| Method | `POST` |
| URL | Configured via `RECOVERY_WEBHOOK_URL` (injected at build time) |
| Timeout | 10 seconds (from Electron's side) |
| Content-Type | `application/json` |

### 5.2 JWT Token Structure and Signing

Every recovery request includes an `Authorization` header with a JWT-like token:

```
Authorization: Bearer <token>
```

The token is an **HMAC-SHA256 signed** payload (not a full JWT with a header segment):

```
<base64url-encoded-payload>.<hmac-sha256-signature>
```

#### Payload structure

| Claim | Type | Description |
|---|---|---|
| `sub` | string | The admin's email address |
| `device_uuid` | string | The device's unique identifier |
| `iat` | number | Issued-at timestamp (Unix epoch seconds) |
| `exp` | number | Expiration timestamp (Unix epoch seconds); always `iat + 300` |
| `jti` | string | Unique token identifier (16 random bytes as hex) |

#### Signing process

```javascript
const payload = JSON.stringify({ sub, device_uuid, iat, exp, jti });
const hmac = createHmac('sha256', RECOVERY_WEBHOOK_SECRET);
hmac.update(payload);
const signature = hmac.digest('hex');
const token = `${Buffer.from(payload).toString('base64url')}.${signature}`;
```

#### Verification on the N8N side

1. Extract the token from the `Authorization: Bearer <token>` header.
2. Split on `.` to separate the payload and signature.
3. Decode the payload from base64url.
4. Recompute the HMAC-SHA256 signature using `RECOVERY_WEBHOOK_SECRET` and compare.
5. Check that `exp > Date.now() / 1000` (token not expired).
6. Optionally verify `device_uuid` matches an expected value.

### 5.3 Request Payload

```json
{
  "email": "admin@example.com",
  "device_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "encrypted_recovery_key": "<hex ciphertext>",
  "iv": "<hex 12-byte IV>",
  "tag": "<hex GCM auth tag>"
}
```

| Field | Description |
|---|---|
| `email` | The admin's email (as provided by the user during recovery request) |
| `device_uuid` | The device identifier for cross-reference |
| `encrypted_recovery_key` | The LMK-encrypted recovery key (ciphertext) |
| `iv` | The initialization vector used for encryption |
| `tag` | The GCM authentication tag |

The N8N workflow should:
1. Verify the JWT signature and expiry.
2. Combine `encrypted_recovery_key`, `iv`, and `tag` into a JSON object.
3. Send this object to the admin via email, along with instructions for using it to reset their password.

### 5.4 Rate Limiting Recommendations

The Electron client enforces rate limiting internally (5 attempts → 1-minute lockout). The N8N endpoint should also implement rate limiting to prevent abuse:

| Recommendation | Value |
|---|---|
| Per-IP rate limit | 10 requests per minute |
| Per-email rate limit | 3 requests per hour |
| Request validation | Reject requests without valid JWT signature |
| Logging | Log all recovery requests with timestamp, IP, and email for audit |

---

## 6. Deployment Checklist

This checklist covers the configuration required to deploy F.O.C.U.S. with a working admin authentication and recovery system.

### 6.1 GitHub Secrets Configuration

The following secrets must be configured in the GitHub repository settings (**Settings → Secrets and variables → Actions**):

| Secret Name | Description | Example |
|---|---|---|
| `RECOVERY_WEBHOOK_URL` | Full HTTPS URL of the N8N webhook endpoint | `https://n8n.example.com/webhook/focus-recovery` |
| `RECOVERY_WEBHOOK_SECRET` | Secret key used for HMAC-SHA256 signing of JWT tokens | A 32+ character random string |

**Generating a secure webhook secret**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6.2 Build-Time Injection Process

During CI builds (triggered by merged pull requests), the `src/main/generated-config.ts` file is auto-generated:

1. The `electron-build-common` action reads `RECOVERY_WEBHOOK_URL` and `RECOVERY_WEBHOOK_SECRET` from GitHub Secrets.
2. It writes `src/main/generated-config.ts` with the values embedded as a JavaScript object:

```typescript
export const CONFIG = {
  RECOVERY_WEBHOOK_URL: 'https://n8n.example.com/webhook/focus-recovery',
  RECOVERY_WEBHOOK_SECRET: 'a1b2c3d4e5f6...',
};
```

3. The file is copied to `dist/main/generated-config.ts` alongside the compiled main process code.
4. At runtime, `src/main/config.ts` exports this `CONFIG` object.

**Important**: `generated-config.ts` is generated fresh on every build and must **never** be committed to version control. It is listed in `.gitignore` via the `.env` ignore patterns and the build action overwrites it each time.

### 6.3 Environment Variables Required

For **local development**, create a `.env` file in the project root with:

```env
RECOVERY_WEBHOOK_URL=https://your-n8n-instance.com/webhook/focus-recovery
RECOVERY_WEBHOOK_SECRET=your-32-byte-hex-secret
```

For **production builds**, these values come from GitHub Secrets and are injected at build time. The `generated-config.ts` file replaces the placeholder values in `src/main/generated-config.ts`.

### 6.4 N8N Workflow Setup

The N8N workflow receiving the recovery webhook should:

1. **Webhook node** configured for `POST` requests at the `RECOVERY_WEBHOOK_URL` path.
2. **HTTP Request node** to verify the JWT signature (or use a code node with Node.js crypto).
3. **Code node** to construct the email body containing:
   - The encrypted recovery key JSON object (`c`, `iv`, `tag`)
   - Instructions for the user to paste it into the app's recovery dialog
4. **Email node** (SendGrid, Gmail, SMTP, etc.) to send the recovery email to the admin.

### 6.5 Pre-Flight Verification

Before deploying a new release, verify:

- [ ] `RECOVERY_WEBHOOK_URL` points to a reachable HTTPS endpoint
- [ ] `RECOVERY_WEBHOOK_SECRET` is a strong, randomly generated value
- [ ] The N8N workflow is active and tested end-to-end
- [ ] A test admin account has been created and the recovery key saved
- [ ] The recovery flow has been tested: request → email received → key pasted → password reset
- [ ] `generated-config.ts` is not present in the repository (should be build-time only)
- [ ] The `.env` file is not committed to version control

---

## Appendix A: Database Schema (Auth-Related Keys)

All authentication data is stored in the `test_config` table:

| Key | Value Type | Description |
|---|---|---|
| `admin_setup_complete` | `'1'` or absent | Flag indicating admin has been registered |
| `admin_password_hash` | bcrypt hash string | Hashed admin password |
| `admin_email_ciphertext` | hex string | LMK-encrypted admin email |
| `admin_email_iv` | hex string | AES-GCM IV for email encryption |
| `admin_email_tag` | hex string | AES-GCM auth tag for email encryption |
| `admin_device_uuid` | UUID string | Machine-bound device identifier |
| `recovery_ciphertext` | hex string | LMK-encrypted recovery key |
| `recovery_iv` | hex string | AES-GCM IV for recovery key |
| `recovery_tag` | hex string | AES-GCM auth tag for recovery key |
| `failed_login_attempts` | integer string | Counter for failed login attempts |
| `lockout_until` | Unix ms timestamp | Epoch time when lockout expires (0 = no lockout) |
| `session_expiry` | Unix ms timestamp | Current session expiry timestamp |
| `device_uuid` | UUID string | Device UUID (also used for LMK derivation salt) |

## Appendix B: Error Messages Reference

| Error Message | Cause | Resolution |
|---|---|---|
| `"Database not initialized"` | `db` is null | Application startup issue; check logs |
| `"Invalid email format"` | Email failed regex validation | Use a valid email address |
| `"Admin not registered"` | No admin account exists | Complete first-time admin setup |
| `"Invalid password"` | Bcrypt comparison failed | Verify password; check lockout status |
| `"Account locked. Please try again in X seconds"` | Within 1-minute lockout window | Wait for lockout to expire |
| `"Too many failed attempts. Account locked for 1 minute"` | 5th consecutive failure | Wait 1 minute |
| `"Unauthorized: Administrator access required"` | Invalid/expired session token | Log in again |
| `"Invalid recovery email"` | Decrypted email does not match input | Use the exact email from setup |
| `"Recovery not permitted on this device"` | Device UUID mismatch | Recovery is device-bound; use original machine |
| `"Invalid recovery key"` | Decrypted key does not match stored key | Verify the recovery key was not corrupted |
| `"Recovery failed: ..."` | General recovery error | Check the detailed message; may indicate LMK/keychain issues |
