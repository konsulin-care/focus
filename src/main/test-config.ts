/**
 * F.O.C.U.S. Assessment - Configuration Module
 * 
 * Test configuration management with database persistence.
 */

import { db } from './database';
import { TestConfig, DEFAULT_TEST_CONFIG } from './types';

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
            config.totalTrials = numValue;
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
  
  const upsertStmt = db.prepare(`
    INSERT INTO test_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  
  const transaction = db.transaction(() => {
    upsertStmt.run('stimulusDurationMs', newConfig.stimulusDurationMs.toString());
    upsertStmt.run('interstimulusIntervalMs', newConfig.interstimulusIntervalMs.toString());
    upsertStmt.run('totalTrials', newConfig.totalTrials.toString());
    upsertStmt.run('bufferMs', newConfig.bufferMs.toString());
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
