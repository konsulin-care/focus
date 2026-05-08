/**
 * F.O.C.U.S. Assessment - Authentication Module
 *
 * Handles admin authentication, registration, and recovery.
 */

import { randomBytes, createHmac } from 'node:crypto';
import { IpcMainInvokeEvent } from 'electron';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { db } from './database';
import { encryptWithLMK, decryptWithLMK, getOrCreateDeviceUUID } from './key-management';
import { CONFIG } from './generated-config';

// ===========================================
// State & Constants
// ===========================================

interface Session {
  webContentsId: number;
  expiry: number;
}

const activeSessions = new Map<string, Session>();
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

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }

  const passwordHash = bcrypt.hashSync(password, 12);
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

  const isValid = bcrypt.compareSync(password, hashRow.value);

  if (isValid) {
    // Reset failure counter
    db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run('0', 'failed_login_attempts');
    db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run('0', 'lockout_until');

    const sessionToken = randomBytes(32).toString('hex');
    const expiry = Date.now() + SESSION_DURATION;

    activeSessions.set(sessionToken, { webContentsId, expiry });
    db.prepare('INSERT OR REPLACE INTO test_config (key, value) VALUES (?, ?)').run(
      'session_expiry',
      expiry.toString()
    );

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

  if (Date.now() > session.expiry) {
    activeSessions.delete(token);
    return false;
  }

  // Extend expiry
  const newExpiry = Date.now() + SESSION_DURATION;
  session.expiry = newExpiry;

  if (db) {
    db.prepare('INSERT OR REPLACE INTO test_config (key, value) VALUES (?, ?)').run(
      'session_expiry',
      newExpiry.toString()
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

  if (!hashRow || !bcrypt.compareSync(password, hashRow.value)) {
    throw new Error('Current password is incorrect');
  }

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
}

/**
 * Check if window has any valid session.
 */
export function isAuthenticated(webContentsId: number): boolean {
  for (const session of activeSessions.values()) {
    if (session.webContentsId === webContentsId && Date.now() <= session.expiry) {
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
 * Reads admin email from database (no user input required).
 */
export async function requestRecovery(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const emailC = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('admin_email_ciphertext') as { value: string } | undefined;
  const emailIv = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('admin_email_iv') as { value: string } | undefined;
  const emailTag = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('admin_email_tag') as { value: string } | undefined;
  const storedUuid = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('admin_device_uuid') as { value: string } | undefined;

  if (!emailC || !emailIv || !emailTag || !storedUuid) {
    throw new Error('Admin configuration missing');
  }

  const decryptedEmail = await decryptWithLMK(emailC.value, emailIv.value, emailTag.value);

  const currentUuid = getOrCreateDeviceUUID(db);
  if (currentUuid !== storedUuid.value) {
    throw new Error('Recovery not permitted on this device');
  }

  // Generate JWT-like token using HMAC-SHA256
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    sub: decryptedEmail,
    device_uuid: currentUuid,
    iat: now,
    exp: now + 300, // 5 min
    jti: randomBytes(16).toString('hex'),
  });

  const hmac = createHmac('sha256', CONFIG.RECOVERY_WEBHOOK_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  const jwt = `${Buffer.from(payload).toString('base64url')}.${signature}`;

  const recoveryC = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('recovery_ciphertext') as { value: string } | undefined;
  const recoveryIv = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('recovery_iv') as { value: string } | undefined;
  const recoveryTag = db
    .prepare('SELECT value FROM test_config WHERE key = ?')
    .get('recovery_tag') as { value: string } | undefined;

  // Fire-and-forget request
  axios
    .post(
      CONFIG.RECOVERY_WEBHOOK_URL,
      {
        email: decryptedEmail,
        device_uuid: currentUuid,
        encrypted_recovery_key: recoveryC?.value,
        iv: recoveryIv?.value,
        tag: recoveryTag?.value,
      },
      {
        headers: { Authorization: `Bearer ${jwt}` },
        timeout: 10000,
      }
    )
    .catch((err) => console.error('[Auth] Recovery webhook failed:', err.message));
}

/**
 * Perform password reset using decrypted recovery key.
 */
export async function performRecovery(
  encryptedKeyJson: string,
  newPassword: string,
  webContentsId?: number
): Promise<{ sessionToken: string }> {
  if (!db) throw new Error('Database not initialized');

  try {
    const { c, iv, tag } = JSON.parse(encryptedKeyJson);
    const decryptedKey = await decryptWithLMK(c, iv, tag);

    // Verify recovery key matches stored ciphertext
    const storedC = db
      .prepare('SELECT value FROM test_config WHERE key = ?')
      .get('recovery_ciphertext') as { value: string } | undefined;
    const storedIv = db
      .prepare('SELECT value FROM test_config WHERE key = ?')
      .get('recovery_iv') as { value: string } | undefined;
    const storedTag = db
      .prepare('SELECT value FROM test_config WHERE key = ?')
      .get('recovery_tag') as { value: string } | undefined;

    if (!storedC || !storedIv || !storedTag) throw new Error('Recovery data missing');

    const verifiedKey = await decryptWithLMK(storedC.value, storedIv.value, storedTag.value);
    if (decryptedKey !== verifiedKey) throw new Error('Invalid recovery key');

    // Update password
    const passwordHash = bcrypt.hashSync(newPassword, 12);

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
    const expiry = Date.now() + SESSION_DURATION;

    if (webContentsId) {
      activeSessions.set(sessionToken, { webContentsId, expiry });
    }

    return { sessionToken };
  } catch (e) {
    throw new Error(`Recovery failed: ${e instanceof Error ? e.message : String(e)}`);
  }
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
  if (!hashRow || !bcrypt.compareSync(currentPassword, hashRow.value)) {
    throw new Error('Current password incorrect');
  }

  const newHash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE test_config SET value = ? WHERE key = ?').run(newHash, 'admin_password_hash');
}

/**
 * Get session token by webContentsId.
 */
export function getSessionTokenByWebContentsId(webContentsId: number): string | null {
  for (const [token, session] of activeSessions.entries()) {
    if (session.webContentsId === webContentsId && Date.now() <= session.expiry) {
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
