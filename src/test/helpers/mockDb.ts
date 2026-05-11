import { vi } from 'vitest';

/**
 * Creates a mock database object that replicates the better-sqlite3 API
 * used in authentication tests. The mock tracks seed data and simulates
 * database operations for testing purposes.
 */
export function createMockDb() {
  const seeds = Object.create(null) as Record<string, string | undefined>;

  const statementMock = {
    get(key: string) {
      return seeds[key] !== undefined ? { value: seeds[key] } : undefined;
    },
    run(...args: [string, string?] | [string]) {
      if (args.length === 1) {
        const [key] = args as [string];
        Reflect.deleteProperty(seeds, key);
        return { changes: 1, lastInsertRowid: 1 };
      }
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
        'device_uuid',
        'admin_setup_complete',
      ]);
      if (insertKeys.has(first)) {
        seeds[first] = second;
        // Sync device_uuid from admin_device_uuid for getOrCreateDeviceUUID compatibility
        if (first === 'admin_device_uuid') {
          seeds['device_uuid'] = second;
        }
      } else {
        seeds[second] = first;
        // Also sync device_uuid to admin_device_uuid for requestRecovery compatibility
        if (second === 'device_uuid') {
          seeds['admin_device_uuid'] = first;
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
      if (query.includes('ON CONFLICT')) {
        return {
          run(...args: [string, string?] | [string]) {
            if (args.length === 1) {
              const value = args[0] as string;
              const keyMatch = query.match(/VALUES\s*\(\s*'([^']+)'/);
              const key = keyMatch ? keyMatch[1] : 'unknown';
              if (!seeds[key]) seeds[key] = value;
              return { changes: 0, lastInsertRowid: 0 };
            }
            const [first, second] = args as [string, string];
            // INSERT OR REPLACE always uses (key, value) order for known keys
            if (query.includes('INSERT OR REPLACE')) {
              // Known auth keys: store as (key=first, value=second)
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
                'admin_setup_complete',
              ]);
              if (insertKeys.has(first)) {
                seeds[first] = second;
                if (first === 'admin_device_uuid' && !seeds['device_uuid']) {
                  seeds['device_uuid'] = second;
                }
              } else {
                // Unrecognised key pattern — fallback to original behaviour
                seeds[second] = first;
                if (second === 'device_uuid') {
                  delete seeds['admin_device_uuid'];
                }
              }
              return { changes: 0, lastInsertRowid: 0 };
            }
            // ON CONFLICT DO UPDATE path — only update if key already exists
            const isDoUpdate = query.includes('DO UPDATE');
            if (isDoUpdate || !seeds[first]) seeds[first] = second;
            if (first === 'admin_device_uuid' && !seeds['device_uuid']) {
              seeds['device_uuid'] = second;
            }
            return { changes: 0, lastInsertRowid: 0 };
          },
        };
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
