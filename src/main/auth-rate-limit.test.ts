/**
 * F.O.C.U.S. Assessment - Auth Rate Limiting Tests
 *
 * Tests validate the rate limiting logic embedded in `loginAdmin` from
 * `src/main/auth.ts`.
 *
 * Uses Vitest with mocked `keytar`, `electron`, and database modules.
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
}));

const keytarState = vi.hoisted(() => ({
  password: null as string | null,
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

// ============================================================================
// Test helpers
// ============================================================================

/**
 * Build a mock database that mimics the better-sqlite3 API used by auth.ts.
 */
function createMockDb() {
  const seeds = Object.create(null) as Record<string, string | undefined>;
  let deviceUuidQueryCount = 0;

  const statementMock = {
    get(key: string) {
      if (key === DB_KEYS.DEVICE_UUID) {
        deviceUuidQueryCount++;
        if (deviceUuidQueryCount === 1) return undefined;
      }
      return seeds[key] !== undefined ? { value: seeds[key] } : undefined;
    },
    run(...args: [string, string]) {
      // Handle both UPDATE (value, key) and INSERT (key, value) orders
      if (args.length === 2) {
        const [first, second] = args as [string, string];
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
        ]);
        if (insertKeys.has(first)) {
          seeds[first] = second; // INSERT format: (key, value)
        } else {
          seeds[second] = first; // UPDATE format: (value, key)
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
      if (query.includes('INSERT') || query.includes('UPDATE')) {
        return { run: statementMock.run.bind(statementMock) };
      }
      return { get: () => undefined, run: () => ({ changes: 1 }) };
    },
    exec: vi.fn(),
    transaction<T>(fn: () => T): () => T {
      return fn as () => T;
    },
    _seeds: seeds,
  };
}

/** Generate a bcrypt hash for a known password. */
function deterministicHash(password: string): string {
  return bcrypt.hashSync(password, 12);
}

// ============================================================================
// Test suites
// ============================================================================

describe('Auth Rate Limiting', () => {
  let db: ReturnType<typeof createMockDb>;
  let auth: typeof import('@/main/auth');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Reset keytar state
    keytarState.password = null;

    // Create a fresh mock DB for each test to avoid state leakage
    db = createMockDb();
    mockDbModule.db = db;

    // Seed common config values
    db._seeds[DB_KEYS.ADMIN_SETUP_COMPLETE] = STR_VALUES.ONE;
    db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
    db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.ZERO;
    db._seeds[DB_KEYS.LOCKOUT_UNTIL] = STR_VALUES.ZERO;

    // Re-import auth module to pick up fresh mocks
    auth = await import('@/main/auth');
  });

  // --------------------------------------------------------------------------
  // Failed login attempts increment counter
  // --------------------------------------------------------------------------

  describe('failed login counter increments', () => {
    it('should increment failed_login_attempts from 0 to 1 on first failure', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.ZERO;

      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');

      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.ONE);
    });

    it('should increment failed_login_attempts on subsequent failures', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.TWO;

      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');

      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.THREE);
    });

    it('should increment from 3 to 4 without triggering lockout', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.THREE;

      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');

      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.FOUR);
      // lockout_until should NOT be set yet
      expect(db._seeds[DB_KEYS.LOCKOUT_UNTIL]).toBe(STR_VALUES.ZERO);
    });
  });

  // --------------------------------------------------------------------------
  // Lockout triggered after 5 attempts
  // --------------------------------------------------------------------------

  describe('lockout after 5 failed attempts', () => {
    it('should set lockout_until on the 5th failed attempt', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.FOUR;

      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow(
        'Too many failed attempts. Account locked for 1 minute'
      );

      // lockout_until should be set to a future timestamp
      expect(db._seeds[DB_KEYS.LOCKOUT_UNTIL]).toMatch(/^\d+$/);
      const lockoutUntil = parseInt(db._seeds[DB_KEYS.LOCKOUT_UNTIL] ?? '0', 10);
      expect(lockoutUntil).toBeGreaterThan(Date.now());
      expect(lockoutUntil).toBeLessThanOrEqual(Date.now() + 60 * 1000 + 1000);
    });

    it('should reject login during lockout with a meaningful error', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');

      // Pre-set lockout to 5 minutes in the future
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = String(Date.now() + 5 * 60 * 1000);

      await expect(loginAdmin('correctPassword', 1)).rejects.toThrow(
        /Account locked\. Please try again in \d+ seconds/
      );
    });

    it('should not increment counter beyond 5 during lockout', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.FIVE;
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = String(Date.now() + 60 * 1000);

      // During lockout, login should fail with lockout error, not "Invalid password"
      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow(/Account locked/);

      // Counter should remain at 5 (not incremented during lockout)
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.FIVE);
    });

    it('should calculate remaining lockout seconds correctly', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      // Set lockout to exactly 45 seconds in the future
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = String(Date.now() + 45 * 1000);

      const error = await loginAdmin('wrongPassword', 1).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatch(/Please try again in 45 seconds/);
    });
  });

  // --------------------------------------------------------------------------
  // Lockout expires after 1 minute
  // --------------------------------------------------------------------------

  describe('lockout expiry', () => {
    it('should allow login after lockout expires', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');

      // Set lockout to 2 minutes in the past (expired)
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = String(Date.now() - 2 * 60 * 1000);

      // Login should succeed even with wrong password (lockout expired)
      // But we test with correct password to verify full flow
      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
    });

    it('should reset failed_login_attempts when lockout expires and login succeeds', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.FIVE;
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = String(Date.now() - 120 * 1000); // expired

      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.ZERO);
      expect(db._seeds[DB_KEYS.LOCKOUT_UNTIL]).toBe(STR_VALUES.ZERO);
    });

    it('should still increment counter after lockout expires on new failure', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.ZERO;
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = String(Date.now() - 120 * 1000); // expired

      // First attempt after lockout expires — should fail and increment to 1
      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.ONE);
      expect(db._seeds[DB_KEYS.LOCKOUT_UNTIL]).toBe(STR_VALUES.ZERO);
    });

    it('should allow a fresh sequence of attempts after lockout expires', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      // Start fresh - lockout expired, counter reset to 0
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.ZERO;
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = STR_VALUES.ZERO;

      // Attempt 1 after lockout expires — should fail and increment to 1
      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.ONE);

      // Attempt 2
      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.TWO);

      // Attempt 3
      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.THREE);

      // Attempt 4
      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.FOUR);

      // Attempt 5 — should trigger new lockout
      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow(
        'Too many failed attempts. Account locked for 1 minute'
      );
      expect(db._seeds[DB_KEYS.LOCKOUT_UNTIL]).toMatch(/^\d+$/);
    });
  });

  // --------------------------------------------------------------------------
  // Successful login resets counter
  // --------------------------------------------------------------------------

  describe('successful login resets counter', () => {
    it('should reset failed_login_attempts to 0 on successful login', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.THREE;

      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.ZERO);
    });

    it('should reset lockout_until to 0 on successful login', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.FOUR;
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = String(Date.now() - 1000); // expired lockout

      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
      expect(db._seeds[DB_KEYS.LOCKOUT_UNTIL]).toBe(STR_VALUES.ZERO);
    });

    it('should create a session on successful login after resetting counter', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.TWO;

      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
      expect(typeof result.sessionToken).toBe('string');
      expect(result.sessionToken.length).toBeGreaterThan(0);
    });

    it('should reset counter to 0 even when it was already 0', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = STR_VALUES.ZERO;

      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.ZERO);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle missing failed_login_attempts key (defaults to 0)', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS] = undefined;

      await expect(loginAdmin('wrongPassword', 1)).rejects.toThrow('Invalid password');
      expect(db._seeds[DB_KEYS.FAILED_LOGIN_ATTEMPTS]).toBe(STR_VALUES.ONE);
    });

    it('should handle missing lockout_until key (no lockout check)', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = undefined;

      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
    });

    it('should not allow login when admin is not registered', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = undefined;

      await expect(loginAdmin('anyPassword', 1)).rejects.toThrow('Admin not registered');
    });

    it('should handle lockout_until set to 0 (no active lockout)', async () => {
      const { loginAdmin } = auth;

      db._seeds[DB_KEYS.ADMIN_PASSWORD_HASH] = deterministicHash('correctPassword');
      db._seeds[DB_KEYS.LOCKOUT_UNTIL] = STR_VALUES.ZERO;

      const result = await loginAdmin('correctPassword', 1);
      expect(result.sessionToken).toBeDefined();
    });
  });
});
