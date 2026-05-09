/**
 * F.O.C.U.S. Assessment - Authentication Module Tests
 *
 * Tests validate authentication, encryption, session management, and
 * recovery flow implemented in `src/main/auth.ts`.
 *
 * Uses Vitest with mocked `keytar`, `axios`, and `electron` modules.
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { DB_KEYS, STR_VALUES } from '@/test/constants';

// ============================================================================
// Shared mock state (vi.hoisted survives vi.resetModules)
// ============================================================================

const mockDbModule = vi.hoisted(() => ({
  db: null as unknown,
  seeds: {} as Record<string, string | undefined>,
  initDatabase: vi.fn(),
}));

const keytarState = vi.hoisted(() => ({
  password: null as string | null,
}));

const axiosPostMock = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({ status: 200 })),
}));

// ============================================================================
// Mocks
// ============================================================================

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/focus-test'),
  },
}));

vi.mock('@/main/database', () => mockDbModule);

vi.mock('keytar', () => ({
  default: {
    getPassword: () => keytarState.password,
    setPassword: (_service: string, _account: string, password: string) => {
      keytarState.password = password;
    },
  },
}));

vi.mock('axios', () => ({
  default: axiosPostMock,
}));

// ============================================================================
// Test helpers
// ============================================================================

/**
 * Build a mock database that mimics the better-sqlite3 API used by auth.ts.
 */
function createMockDb() {
  const seeds: Record<string, string | undefined> = {};
  let deviceUuidQueryCount = 0;

  const statementMock = {
    get(key: string) {
      // First query for 'device_uuid' returns undefined (triggers UUID generation)
      if (key === DB_KEYS.DEVICE_UUID) {
        deviceUuidQueryCount++;
        if (deviceUuidQueryCount === 1) return undefined;
      }
      return seeds[key] !== undefined ? { value: seeds[key] } : undefined;
    },
    run(...args: [string, string?] | [string]) {
      // DELETE queries: just the key (e.g., DELETE FROM test_config WHERE key = ?)
      if (args.length === 1) {
        const [key] = args as [string];
        Reflect.deleteProperty(seeds, key);
        return { changes: 1, lastInsertRowid: 1 };
      }
      // Handle both UPDATE (value, key) and INSERT (key, value) orders
      // UPDATE: `SET value = ? WHERE key = ?` → run(value, key)
      // INSERT: `VALUES (?, ?)` → run(key, value)
      const [first, second] = args as [string, string];
      // Keys used in INSERT statements (key, value) order
      const insertKeys = new Set([
        'session_expiry',
        'admin_password_hash',
        'lockout_until',
        'failed_login_attempts',
        'recovery_ciphertext',
        'recovery_iv',
        'recovery_tag',
        'admin_email_ciphertext',
        'admin_email_iv',
        'admin_email_tag',
        'admin_device_uuid',
        'device_uuid',
        'admin_setup_complete',
      ]);
      if (insertKeys.has(first)) {
        seeds[first] = second; // INSERT format: (key, value)
        // Sync device_uuid from admin_device_uuid for getOrCreateDeviceUUID compatibility
        if (first === DB_KEYS.ADMIN_DEVICE_UUID) {
          seeds[DB_KEYS.DEVICE_UUID] = second;
          deviceUuidQueryCount = 2;
        }
      } else {
        seeds[second] = first; // UPDATE format: (value, key)
        // Also sync device_uuid to admin_device_uuid for requestRecovery compatibility
        if (second === DB_KEYS.DEVICE_UUID) {
          seeds[DB_KEYS.ADMIN_DEVICE_UUID] = first;
        }
      }
      return { changes: 1, lastInsertRowid: 1 };
    },
  };

  return {
    prepare(query: string) {
      if (query.includes('SELECT value FROM test_config WHERE key =')) {
        return { get: statementMock.get.bind(statementMock) };
      }
      if (query.includes('INSERT') || query.includes('UPDATE') || query.includes('DELETE')) {
        return { run: statementMock.run.bind(statementMock) };
      }
      return { get: () => undefined, run: () => ({ changes: 1 }) };
    },
    exec: vi.fn(),
    transaction<T>(fn: () => T): () => T {
      return () => fn();
    },
    _seeds: seeds,
  };
}

/** Generate a bcrypt hash for a known password. */
function deterministicHash(password: string): string {
  return bcrypt.hashSync(password, 12);
}

/** Build a mock IPC event for requireAdmin tests. */
function mockIpcEvent(webContentsId: number) {
  return { sender: { id: webContentsId } } as unknown as import('electron').IpcMainInvokeEvent;
}

// ============================================================================
// Test suites
// ============================================================================

describe('Authentication Module', () => {
  let db!: ReturnType<typeof createMockDb>;
  let auth: typeof import('@/main/auth');

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Reset keytar state
    keytarState.password = null;

    // Replace the mutable DB reference used by the mock
    db = createMockDb();
    mockDbModule.db = db;

    // Seed common config values
    db._seeds[DB_KEYS.ADMIN_SETUP_COMPLETE] = STR_VALUES.ONE;
    db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
    db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.ZERO;
    db._seeds[DB_KEYS.LOCKOUT_UNTIL] = STR_VALUES.ZERO;

    // Import auth after all mocks are in place
    auth = await import('@/main/auth');
  });

  // --------------------------------------------------------------------------
  // bcrypt hash / compare round-trip
  // --------------------------------------------------------------------------

  describe('bcrypt hash/compare', () => {
    it('should authenticate with the correct password', async () => {
      const { loginAdmin } = auth;
      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
      expect(typeof result.sessionToken).toBe('string');
    });

    it('should reject an incorrect password', async () => {
      const { loginAdmin } = auth;
      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');
    });

    it('should produce a bcrypt-compatible hash string', () => {
      const hash = deterministicHash('test');
      expect(hash).toMatch(/^\$2[aby]\$\d+\$.{53}$/);
    });
  });

  // --------------------------------------------------------------------------
  // AES-GCM encrypt/decrypt round-trip (via LMK)
  // --------------------------------------------------------------------------

  describe('AES-GCM encrypt/decrypt', () => {
    it('should decrypt data that was encrypted with the LMK', async () => {
      const { encryptWithLMK, decryptWithLMK } = await import('@/main/key-management');

      const plaintext = 'focus-secret-data';
      const encrypted = await encryptWithLMK(plaintext);

      expect(encrypted.ciphertext.length).toBeGreaterThan(0);
      expect(encrypted.iv.length).toBeGreaterThan(0);
      expect(encrypted.tag.length).toBeGreaterThan(0);

      const decrypted = await decryptWithLMK(encrypted.ciphertext, encrypted.iv, encrypted.tag);
      expect(decrypted).toBe(plaintext);
    });

    it('should reject tampered ciphertext', async () => {
      const { encryptWithLMK, decryptWithLMK } = await import('@/main/key-management');

      const plaintext = 'original-data';
      const encrypted = await encryptWithLMK(plaintext);

      // Flip a character in the ciphertext
      const tampered = `${encrypted.ciphertext.slice(0, 4)}XXXX${encrypted.ciphertext.slice(4)}`;

      await expect(decryptWithLMK(tampered, encrypted.iv, encrypted.tag)).rejects.toThrow(
        /Decryption process failed/i
      );
    });
  });

  // --------------------------------------------------------------------------
  // LMK creation and retrieval (mock keytar)
  // --------------------------------------------------------------------------

  describe('LMK creation and retrieval', () => {
    it('should reuse existing key from keytar', async () => {
      const { getOrCreateLMK } = await import('@/main/key-management');

      const existingKey = 'a'.repeat(64); // 32 bytes hex
      keytarState.password = existingKey;

      const result = await getOrCreateLMK();
      expect(result).toBe(existingKey);
    });

    it('should generate and store a new key when none exists', async () => {
      const { getOrCreateLMK } = await import('@/main/key-management');

      // keytarState.password is null by default after beforeEach reset
      const result = await getOrCreateLMK();
      expect(result).toHaveLength(64); // 32 bytes as hex
      expect(keytarState.password).toBe(result);
    });
  });

  // --------------------------------------------------------------------------
  // Session creation and expiry
  // --------------------------------------------------------------------------

  describe('Session management', () => {
    it('should create a session and store expiry on login', async () => {
      const { loginAdmin } = auth;

      const result = await loginAdmin('correctPassword', 42);

      expect(result.sessionToken).toBeDefined();
      expect(db._seeds[DB_KEYS.SESSION_EXPIRY]).toBeDefined();

      const expiry = parseInt(db._seeds[DB_KEYS.SESSION_EXPIRY]!, 10);
      expect(expiry).toBeGreaterThan(Date.now());
      expect(expiry).toBeLessThanOrEqual(Date.now() + 10 * 60 * 1000 + 1000);
    });

    it('should extend session expiry on valid verifySession call', async () => {
      const { loginAdmin, verifySession } = auth;

      await loginAdmin('correctPassword', 1);
      const token = (await loginAdmin('correctPassword', 1)).sessionToken;

      const valid = verifySession(token, 1);
      expect(valid).toBe(true);

      const expiry = parseInt(db._seeds[DB_KEYS.SESSION_EXPIRY]!, 10);
      expect(expiry).toBeGreaterThan(Date.now());
    });

    it('should reject expired sessions', async () => {
      const { loginAdmin, verifySession } = auth;

      // Use fake timers so we can fast-forward past session expiry
      vi.useFakeTimers();

      const loginResult = await loginAdmin('correctPassword', 1);
      const token = loginResult.sessionToken;

      // Advance 11 minutes past the 10-minute session duration
      vi.advanceTimersByTime(11 * 60 * 1000);

      const valid = verifySession(token, 1);
      expect(valid).toBe(false);

      vi.useRealTimers();
    });

    it('should reject sessions with mismatched webContentsId', async () => {
      const { loginAdmin, verifySession } = auth;

      await loginAdmin('correctPassword', 1);
      const token = (await loginAdmin('correctPassword', 1)).sessionToken;

      const valid = verifySession(token, 999);
      expect(valid).toBe(false);
    });

    it('should invalidate all sessions', async () => {
      const { loginAdmin, invalidateAllSessions, isAuthenticated } = auth;

      await loginAdmin('correctPassword', 1);
      await loginAdmin('correctPassword', 2);

      invalidateAllSessions();

      expect(isAuthenticated(1)).toBe(false);
      expect(isAuthenticated(2)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // requireAdmin guard
  // --------------------------------------------------------------------------

  describe('requireAdmin guard', () => {
    it('should throw when no valid session exists for the sender', () => {
      const { requireAdmin } = auth;

      expect(() => requireAdmin(mockIpcEvent(999))).toThrow(
        'Unauthorized: Administrator access required'
      );
    });

    it('should not throw when a valid session exists', async () => {
      const { requireAdmin, loginAdmin } = auth;

      await loginAdmin('correctPassword', 1);
      // requireAdmin should not throw for an authenticated sender
      expect(() => requireAdmin(mockIpcEvent(1))).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // JWT signing claims (via requestRecovery)
  // --------------------------------------------------------------------------

  describe('JWT claims in recovery token', () => {
    it('should include exp, iat, and jti claims', async () => {
      const { registerAdmin, requestRecovery } = auth;

      // Seed keytar so encryption uses a deterministic LMK
      const lmk = 'c'.repeat(64);
      keytarState.password = lmk;

      // Register admin to populate required DB fields
      await registerAdmin('admin@example.com', 'password123');

      // Call requestRecovery – this fires the webhook via axios
      await requestRecovery();

      // Verify axios.post was called with Authorization header
      expect(axiosPostMock.post).toHaveBeenCalled();
      const callArgs = (axiosPostMock.post as ReturnType<typeof vi.fn>).mock.calls[0];
      // Verify axios.post was called with expected arguments (url, data, config)
      if (!callArgs[2]) {
        throw new Error('Expected axios.post to be called with config object (3rd argument)');
      }
      const config = callArgs[2] as { headers?: { Authorization?: string } };
      if (!config.headers?.Authorization) {
        throw new Error('Authorization header missing in axios.post config');
      }
      const authHeader = config.headers.Authorization;
      expect(authHeader).toMatch(/^Bearer \S+$/);

      // Decode the JWT payload (first segment before the dot)
      const jwtToken = authHeader.replace('Bearer ', '');
      const payloadBase64 = jwtToken.split('.')[0];
      const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson);

      // Verify required claims
      expect(payload.exp).toBeDefined();
      expect(typeof payload.exp).toBe('number');
      expect(payload.iat).toBeDefined();
      expect(typeof payload.iat).toBe('number');
      expect(payload.jti).toBeDefined();
      expect(typeof payload.jti).toBe('string');
      expect(payload.jti).toHaveLength(32); // 16 bytes hex

      // Verify additional claims present in the JWT
      expect(payload.sub).toBe('admin@example.com');
      expect(payload.device_uuid).toBeDefined();
      expect(typeof payload.device_uuid).toBe('string');

      // Verify exp is exactly 300 seconds (5 min) after iat
      expect(payload.exp - payload.iat).toBe(300);
    });
  });

  // --------------------------------------------------------------------------
  // deleteAdmin function
  // --------------------------------------------------------------------------

  describe('deleteAdmin', () => {
    it('should throw error when password is incorrect', async () => {
      const { deleteAdmin } = auth;

      await expect(deleteAdmin('wrongPassword', false)).rejects.toThrow(
        'Current password is incorrect'
      );
    });

    it('should clear admin auth fields and reset setup flag', async () => {
      const { deleteAdmin } = auth;

      await deleteAdmin('correctPassword', false);

      // Verify setup complete flag is reset
      expect(db._seeds[DB_KEYS.ADMIN_SETUP_COMPLETE]).toBe(STR_VALUES.ZERO);

      // Verify auth fields are deleted
      expect(db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH]).toBeUndefined();
      expect(db._seeds[DB_KEYS.ADMIN_EMAIL_CIPHERTEXT]).toBeUndefined();
      expect(db._seeds[DB_KEYS.ADMIN_EMAIL_IV]).toBeUndefined();
      expect(db._seeds[DB_KEYS.ADMIN_EMAIL_TAG]).toBeUndefined();
      expect(db._seeds[DB_KEYS.ADMIN_DEVICE_UUID]).toBeUndefined();
      expect(db._seeds[DB_KEYS.RECOVERY_CIPHERTEXT]).toBeUndefined();
      expect(db._seeds[DB_KEYS.RECOVERY_IV]).toBeUndefined();
      expect(db._seeds[DB_KEYS.RECOVERY_TAG]).toBeUndefined();
    });

    it('should wipe test data when wipeData is true', async () => {
      // Re-seed the db with test data
      const { deleteAdmin, registerAdmin } = auth;

      // Seed keytar for registration
      keytarState.password = 'c'.repeat(64);

      // First register an admin
      await registerAdmin('test@example.com', 'password123');

      // Create mock tables by inserting seed data for trial_data and test_sessions
      db._seeds[DB_KEYS.ADMIN_SETUP_COMPLETE] = STR_VALUES.ONE;
      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('password123');

      await deleteAdmin('password123', true);

      // Verify setup flag is reset
      expect(db._seeds[DB_KEYS.ADMIN_SETUP_COMPLETE]).toBe(STR_VALUES.ZERO);
    });
  });
});
