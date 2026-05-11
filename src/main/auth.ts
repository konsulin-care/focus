/**
 * F.O.C.U.S. Assessment - Authentication Module
 *
 * Handles admin authentication, registration, and recovery.
 */

import { randomBytes } from 'node:crypto';
import type { IpcMainInvokeEvent } from 'electron';
import bcrypt from 'bcryptjs';
import { db } from './database';
import { encryptWithLMK, decryptWithLMK, getOrCreateDeviceUUID } from './key-management';

// ===========================================
// State & Constants
// ===========================================

interface Session {
  webContentsId: number;
  expiry: bigint;
}

const activeSessions = new Map<string, Session>();

// Export for testing
export { activeSessions };
const SESSION_DURATION = 10 * 60 * 1000; // 10 minutes

// ===========================================
// Core Functions
// ===========================================

/**
 * Initialize authentication state.
 */
export function initAuth(): void {
  activeSessions.clear();
}

/**
 * Check if admin setup is complete.
 */
export function isAdminSetup(): boolean {
  if (!db) return false;
  const row = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('admin_setup_complete') as { value: string } | undefined;
  return row?.value === '1';
}

/**
 * Register the first administrator.
 */
export async function registerAdmin(
  email: string,
  password: string
): Promise<{ recoveryKey: string }> {
  if (!db) throw new Error('Database not initialized');
  if (isAdminSetup()) {
    throw new Error('Admin already registered');
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const encryptedEmail = await encryptWithLMK(email);
  const deviceUuid = getOrCreateDeviceUUID(db);

  // Generate 32-byte recovery key
  const recoveryKey = randomBytes(32).toString('hex');
  const encryptedRecovery = await encryptWithLMK(recoveryKey);

  const upsertStmt = db.prepare(`
    INSERT INTO test_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  db.transaction(() => {
    upsertStmt.run('admin_password_hash', passwordHash);
    upsertStmt.run('admin_email_ciphertext', encryptedEmail.ciphertext);
    upsertStmt.run('admin_email_iv', encryptedEmail.iv);
    upsertStmt.run('admin_email_tag', encryptedEmail.tag);
    upsertStmt.run('admin_device_uuid', deviceUuid);
    upsertStmt.run('recovery_ciphertext', encryptedRecovery.ciphertext);
    upsertStmt.run('recovery_iv', encryptedRecovery.iv);
    upsertStmt.run('recovery_tag', encryptedRecovery.tag);
    upsertStmt.run('admin_setup_complete', '1');
    upsertStmt.run('failed_login_attempts', '0');
  })();

  return { recoveryKey };
}

/**
 * Authenticate administrator.
 */
export async function loginAdmin(
  password: string,
  webContentsId: number
): Promise<{ sessionToken: string }> {
  if (!db) throw new Error('Database not initialized');

  // Check lockout
  const lockoutRow = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('lockout_until') as { value: string } | undefined;
  if (lockoutRow) {
    const lockoutUntil = parseInt(lockoutRow.value, 10);
    if (Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      throw new Error(`Account locked. Please try again in ${remaining} seconds`);
    }
    // Lockout expired - reset it
    db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run('0', 'lockout_until');
  }

  const hashRow = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('admin_password_hash') as { value: string } | undefined;
  if (!hashRow) throw new Error('Admin not registered');

  const isValid = await bcrypt.compare(password, hashRow.value);

  if (isValid) {
    // Reset failure counter
    db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run('0', 'failed_login_attempts');
    db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run('0', 'lockout_until');

    const sessionToken = randomBytes(32).toString('hex');
    const expiryMs = Date.now() + SESSION_DURATION;
    const nowNs = process.hrtime.bigint();
    const expiryNs = nowNs + BigInt(SESSION_DURATION) * 1_000_000n;
    activeSessions.set(sessionToken, { webContentsId, expiry: expiryNs });

    if (db) {
      db.prepare('INSERT OR REPLACE INTO test_config (key, value) VALUES (?, ?)').run(
        'session_expiry',
        expiryMs.toString()
      );
    }

    return { sessionToken };
  } else {
    // Handle failure and lockout
    const attemptsRow = db
      .prepare('SELECT value FROM test_config WHERE key = ?')
      .get('failed_login_attempts') as { value: string } | undefined;
    const attempts = parseInt(attemptsRow?.value || '0', 10) + 1;

    db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run(
      attempts.toString(),
      'failed_login_attempts'
    );

    if (attempts >= 5) {
      const lockoutUntil = Date.now() + 60 * 1000; // 1 minute
      db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run(
        lockoutUntil.toString(),
        'lockout_until'
      );
      throw new Error('Too many failed attempts. Account locked for 1 minute');
    }

    throw new Error('Invalid password');
  }
}

/**
 * Verify and extend session.
 */
export function verifySession(token: string, webContentsId: number): boolean {
  const session = activeSessions.get(token);
  if (!session || session.webContentsId !== webContentsId) return false;

  const nowNs = process.hrtime.bigint();
  if (nowNs > session.expiry) {
    activeSessions.delete(token);
    return false;
  }

  // Extend expiry
  const newExpiryNs = nowNs + BigInt(SESSION_DURATION) * 1_000_000n;
  session.expiry = newExpiryNs;

  if (db) {
    db.prepare('INSERT OR REPLACE INTO test_config (key, value) VALUES (?, ?)').run(
      'session_expiry',
      (Date.now() + SESSION_DURATION).toString()
    );
  }

  return true;
}

/**
 * Logout session for a specific token.
 */
export function logoutSession(token: string): void {
  activeSessions.delete(token);
  if (db) {
    db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run('0', 'session_expiry');
  }
}

/**
 * Terminate all active sessions.
 */
export function invalidateAllSessions(): void {
  activeSessions.clear();
  if (db) {
    db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run('0', 'session_expiry');
  }
}

/**
 * Delete admin account and optionally wipe all test data.
 * Requires password verification before deletion.
 * @param password - Current admin password for verification
 * @param wipeData - If true, also delete all test sessions and trial data
 */
export async function deleteAdmin(password: string, wipeData: boolean): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // Verify password before deletion
  const hashRow = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('admin_password_hash') as { value: string } | undefined;

  if (!hashRow || !(await bcrypt.compare(password, hashRow.value))) {
    return Promise.reject(new Error('Current password is incorrect'));
  }

  // Revoke all existing sessions after password verification
  invalidateAllSessions();

  // Begin transaction for atomic deletion
  db.transaction(() => {
    // Clear all admin auth fields
    const clearKeys = [
      'admin_password_hash',
      'admin_email_ciphertext',
      'admin_email_iv',
      'admin_email_tag',
      'admin_device_uuid',
      'recovery_ciphertext',
      'recovery_iv',
      'recovery_tag',
      'failed_login_attempts',
      'lockout_until',
      'session_expiry',
    ];

    for (const key of clearKeys) {
      db!.prepare('DELETE FROM test_config WHERE key = ?').run(key);
    }

    // Reset setup complete flag
    db!
      .prepare(
        'INSERT INTO test_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      .run('admin_setup_complete', '0');

    // Optionally wipe test data
    if (wipeData) {
      db!.prepare('DELETE FROM trial_data').run();
      db!.prepare('DELETE FROM test_sessions').run();
    }
  })();

  return Promise.resolve();
}

/**
 * Check if window has any valid session.
 */
export function isAuthenticated(webContentsId: number): boolean {
  const nowNs = process.hrtime.bigint();
  for (const session of activeSessions.values()) {
    if (session.webContentsId === webContentsId && nowNs <= session.expiry) {
      return true;
    }
  }
  return false;
}

// ===========================================
// Recovery Flow
// ===========================================

/**
 * Validate a plaintext recovery key against the stored encrypted key.
 */
export async function validateRecoveryKey(recoveryKey: string): Promise<{ valid: boolean }> {
  if (!db) throw new Error('Database not initialized');

  // Validate format: 64-character hex string
  if (!/^[a-fA-F0-9]{64}$/.test(recoveryKey)) {
    return { valid: false };
  }

  // Get stored recovery key (encrypted)
  const storedC = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('recovery_ciphertext') as { value: string } | undefined;
  const storedIv = db.prepare('SELECT value FROM test_config WHERE key = ?').get('recovery_iv') as
    | { value: string }
    | undefined;
  const storedTag = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('recovery_tag') as { value: string } | undefined;

  if (!storedC || !storedIv || !storedTag) {
    return { valid: false };
  }

  // Decrypt stored key and compare
  const decryptedStored = await decryptWithLMK(storedC.value, storedIv.value, storedTag.value);

  if (recoveryKey.toLowerCase() === decryptedStored.toLowerCase()) {
    return { valid: true };
  }

  return { valid: false };
}

/**
 * Request a recovery token via webhook.
 * Temporarily disabled – direct recovery via saved key remains available.
 */
export function requestRecovery(_email: string): Promise<void> {
  void _email; // intentionally unused – email recovery disabled
  return Promise.reject(new Error('Email recovery is temporarily unavailable'));
}

/**
 * Perform password reset using either a plaintext recovery key (direct) or
 * an encrypted JSON payload (email). Direct recovery is currently the only
 * available path.
 */
export async function performRecovery(
  recoveryKeyOrJson: string,
  newPassword: string,
  webContentsId?: number
): Promise<{ sessionToken: string }> {
  if (!db) throw new Error('Database not initialized');
  if (webContentsId === undefined) {
    throw new Error('webContentsId is required for session creation');
  }

  // Resolve the plaintext recovery key from the input
  let plaintextKey: string;

  try {
    const parsed = JSON.parse(recoveryKeyOrJson);
    // If it looks like the expected JSON structure, treat as email-path payload
    if (parsed.c && parsed.iv && parsed.tag) {
      plaintextKey = await decryptWithLMK(parsed.c, parsed.iv, parsed.tag);
    } else {
      plaintextKey = recoveryKeyOrJson;
    }
  } catch {
    // JSON parse failed – treat input as direct plaintext recovery key
    plaintextKey = recoveryKeyOrJson;
  }

  // Validate format: must be 64-char hexadecimal
  if (!/^[a-fA-F0-9]{64}$/.test(plaintextKey)) {
    throw new Error('Invalid recovery key format');
  }

  // Verify recovery key matches stored encrypted recovery key
  const storedC = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('recovery_ciphertext') as { value: string } | undefined;
  const storedIv = db.prepare('SELECT value FROM test_config WHERE key = ?').get('recovery_iv') as
    | { value: string }
    | undefined;
  const storedTag = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('recovery_tag') as { value: string } | undefined;

  if (!storedC || !storedIv || !storedTag) {
    throw new Error('Recovery data missing');
  }

  const verifiedKey = await decryptWithLMK(storedC.value, storedIv.value, storedTag.value);
  if (plaintextKey.toLowerCase() !== verifiedKey.toLowerCase()) {
    throw new Error('Invalid recovery key');
  }

  // Update password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Generate new recovery key
  const newRecoveryKey = randomBytes(32).toString('hex');
  const encryptedNewRecovery = await encryptWithLMK(newRecoveryKey);

  const upsertStmt = db.prepare(`
    INSERT INTO test_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  db.transaction(() => {
    upsertStmt.run('admin_password_hash', passwordHash);
    upsertStmt.run('recovery_ciphertext', encryptedNewRecovery.ciphertext);
    upsertStmt.run('recovery_iv', encryptedNewRecovery.iv);
    upsertStmt.run('recovery_tag', encryptedNewRecovery.tag);
    upsertStmt.run('failed_login_attempts', '0');
    upsertStmt.run('lockout_until', '0');
  })();

  // Create new session token associated with webContentsId
  const sessionToken = randomBytes(32).toString('hex');
  const expiryMs = Date.now() + SESSION_DURATION;
  const nowNs = process.hrtime.bigint();
  const expiryNs = nowNs + BigInt(SESSION_DURATION) * 1_000_000n;

  activeSessions.set(sessionToken, { webContentsId, expiry: expiryNs });

  if (db) {
    db.prepare('INSERT OR REPLACE INTO test_config (key, value) VALUES (?, ?)').run(
      'session_expiry',
      expiryMs.toString()
    );
  }

  return { sessionToken };
}

// ===========================================
// Utilities & Guards
// ===========================================

/**
 * Change admin password.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const hashRow = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('admin_password_hash') as { value: string } | undefined;
  if (!hashRow || !(await bcrypt.compare(currentPassword, hashRow.value))) {
    throw new Error('Current password incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run(
    passwordHash,
    'admin_password_hash'
  );

  // Revoke all existing sessions after password change
  invalidateAllSessions();
}

/**
 * Get session token by webContentsId.
 */
export function getSessionTokenByWebContentsId(webContentsId: number): string | null {
  const nowNs = process.hrtime.bigint();
  for (const [token, session] of activeSessions.entries()) {
    if (session.webContentsId === webContentsId && nowNs <= session.expiry) {
      return token;
    }
  }
  return null;
}

/**
 * IPC Guard for admin-only actions.
 */
export function requireAdmin(event: IpcMainInvokeEvent): void {
  if (!isAuthenticated(event.sender.id)) {
    throw new Error('Unauthorized: Administrator access required');
  }
}
