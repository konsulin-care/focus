/**
 * F.O.C.U.S. Assessment - Configuration Module
 *
 * Test configuration management with database persistence.
 */

import { db } from './database';
import { TestConfig, DEFAULT_TEST_CONFIG } from './types';

/**
 * Round up totalTrials to the nearest even number.
 * The two-half ratio system requires an even number of trials.
 *
 * @param totalTrials - Original trial count
 * @returns Nearest even number >= totalTrials
 */
export function normalizeToEven(totalTrials: number): number {
  if (totalTrials % 2 === 0) {
    return totalTrials;
  }
  const normalized = totalTrials + 1;
  console.warn(
    `[CFG] totalTrials ${totalTrials} is odd, rounded up to ${normalized} for two-half ratio system`
  );
  return normalized;
}

/**
 * Get test configuration from database or defaults.
 *
 * @returns Current test configuration
 */
export function getTestConfig(): TestConfig {
  const config: TestConfig = { ...DEFAULT_TEST_CONFIG };

  if (!db) {
    console.warn('[CFG] Database not initialized, returning defaults');
    return config;
  }

  try {
    const stmt = db.prepare('SELECT key, value FROM test_config');
    const rows = stmt.all() as { key: string; value: string }[];

    for (const row of rows) {
      const numValue = parseInt(row.value, 10);
      if (!isNaN(numValue)) {
        switch (row.key) {
          case 'stimulusDurationMs':
            config.stimulusDurationMs = numValue;
            break;
          case 'interstimulusIntervalMs':
            config.interstimulusIntervalMs = numValue;
            break;
          case 'totalTrials':
            // Normalize to even for two-half ratio system
            config.totalTrials = normalizeToEven(numValue);
            break;
          case 'bufferMs':
            config.bufferMs = numValue;
            break;
        }
      }
    }
  } catch (error) {
    console.error('[CFG] Failed to load test config:', error);
  }

  return config;
}

/**
 * Save test configuration to database.
 *
 * @param newConfig - Configuration to save
 */
export function saveTestConfig(newConfig: TestConfig): void {
  if (!db) {
    console.error('[CFG] Database not initialized!');
    return;
  }

  // Normalize totalTrials to even before saving
  const normalizedConfig = {
    ...newConfig,
    totalTrials: normalizeToEven(newConfig.totalTrials),
  };

  const upsertStmt = db.prepare(`
    INSERT INTO test_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const transaction = db.transaction(() => {
    upsertStmt.run('stimulusDurationMs', normalizedConfig.stimulusDurationMs.toString());
    upsertStmt.run('interstimulusIntervalMs', normalizedConfig.interstimulusIntervalMs.toString());
    upsertStmt.run('totalTrials', normalizedConfig.totalTrials.toString());
    upsertStmt.run('bufferMs', normalizedConfig.bufferMs.toString());
  });

  try {
    transaction();
    console.log('[CFG] Test config saved successfully');
  } catch (error) {
    console.error('[CFG] Failed to save test config:', error);
    throw error;
  }
}

/**
 * Reset test configuration to defaults.
 */
export function resetTestConfig(): void {
  saveTestConfig(DEFAULT_TEST_CONFIG);
}
