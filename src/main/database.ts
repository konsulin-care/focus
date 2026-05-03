/**
 * F.O.C.U.S. Assessment - Database Module
 *
 * Database initialization with SQLCipher encryption and query whitelist.
 * Uses better-sqlite3 for local data persistence.
 */

import * as path from 'node:path';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { DatabaseQueryCommand, QueryWhitelistEntry } from './types';
import { getOrCreateEncryptionKey, migrateToEncrypted } from './encryption';
import { processTestEvents } from '@/shared/utils/trial-processing';
import { calculateMean, calculateStdDevWithMean } from '@/shared/utils/basic-stats';
import { calculateDPrime } from '@/shared/utils/clinical-metrics';
import { getNormativeStats } from '@/shared/utils/normative-data';
import { TRIAL_CONSTANTS } from '@/shared/utils/constants';

interface LegacyRow {
  id: number;
  test_data: string;
  email: string;
  created_at: string;
  upload_status: string;
  consent_given: number;
  consent_timestamp: string | null;
}

// ===========================================
// Database Instance
// ===========================================

/**
 * SQLite database instance with SQLCipher encryption.
 * Initialized by initDatabase().
 */
export let db: Database.Database | null = null;

// ===========================================
// Query Whitelist
// ===========================================

/**
 * Safe query whitelist - maps command identifiers to predefined SQL queries.
 * Prevents SQL injection by only allowing predefined queries.
 */
export const queryWhitelist: Record<DatabaseQueryCommand, QueryWhitelistEntry> = {
  'get-pending-uploads': {
    sql: 'SELECT * FROM test_results WHERE upload_status = ?',
    paramCount: 1,
    type: 'select-many',
  },
  'get-test-result': {
    sql: 'SELECT * FROM test_results WHERE id = ?',
    paramCount: 1,
    type: 'select-one',
  },
  'delete-test-result': {
    sql: 'DELETE FROM test_results WHERE id = ?',
    paramCount: 1,
    type: 'write',
  },
  'get-upload-count': {
    sql: 'SELECT COUNT(*) as count FROM test_results WHERE upload_status = ?',
    paramCount: 1,
    type: 'select-one',
  },
  'get-all-test-results': {
    sql: 'SELECT * FROM test_results',
    paramCount: 0,
    type: 'select-many',
  },
  'insert-test-result': {
    sql: 'INSERT INTO test_results (test_data, email, upload_status, created_at, consent_given, consent_timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    paramCount: 6,
    type: 'write',
  },
  'insert-test-result-with-consent': {
    sql: 'INSERT INTO test_results (test_data, email, upload_status, consent_given, consent_timestamp) VALUES (?, ?, ?, ?, ?)',
    paramCount: 5,
    type: 'write',
  },
  'update-test-result': {
    sql: 'UPDATE test_results SET upload_status = ? WHERE id = ?',
    paramCount: 2,
    type: 'write',
  },
  'cleanup-expired-records': {
    sql: 'DELETE FROM test_sessions WHERE retention_expires_at < datetime("now")',
    paramCount: 0,
    type: 'write',
  },
  'get-expired-count': {
    sql: 'SELECT COUNT(*) as count FROM test_sessions WHERE retention_expires_at < datetime("now")',
    paramCount: 0,
    type: 'select-one',
  },
  'get-all-sessions': {
    sql: `
       SELECT 
         ts.id, ts.test_date, ts.acs_score, ts.acs_interpretation, 
         ts.mean_response_time_ms, ts.response_time_variability,
         ts.commission_errors, ts.omission_errors, ts.hits, ts.d_prime,
         ts.validity, ts.validity_reason, ts.total_trials, ts.test_config,
         ts.upload_status, ts.uploaded_at, ts.consent_given, ts.consent_timestamp,
         u.id as user_id, u.email, u.age, u.gender, u.is_generic
       FROM test_sessions ts
       JOIN users u ON ts.user_id = u.id
       ORDER BY ts.test_date DESC
     `,
    paramCount: 0,
    type: 'select-many',
  },
  'get-session-with-user': {
    sql: `
       SELECT 
         ts.id, ts.test_date, ts.acs_score, ts.acs_interpretation, 
         ts.mean_response_time_ms, ts.response_time_variability,
         ts.commission_errors, ts.omission_errors, ts.hits, ts.d_prime,
         ts.validity, ts.validity_reason, ts.total_trials, ts.test_config,
         ts.upload_status, ts.uploaded_at, ts.consent_given, ts.consent_timestamp,
         u.id as user_id, u.email, u.age, u.gender, u.is_generic
       FROM test_sessions ts
       JOIN users u ON ts.user_id = u.id
       WHERE ts.id = ?
     `,
    paramCount: 1,
    type: 'select-one',
  },
  'get-session-trials': {
    sql: `
        SELECT id, test_session_id, trial_index, stimulus_type, outcome,
               response_correct, response_time_ms, is_anticipatory,
               is_multiple_response, follows_commission
        FROM trial_data
        WHERE test_session_id = ?
        ORDER BY trial_index ASC
      `,
    paramCount: 1,
    type: 'select-many',
  },
  'update-session-status': {
    sql: 'UPDATE test_sessions SET upload_status = ?, uploaded_at = ? WHERE id = ?',
    paramCount: 3,
    type: 'write',
  },
  'bulk-delete-sessions': {
    sql: 'DELETE FROM test_sessions WHERE id = ?',
    paramCount: 1,
    type: 'write',
  },
};

// ===========================================
// Database Initialization
// ===========================================

/**
 * Initialize the database with SQLCipher encryption.
 * Handles migration from unencrypted to encrypted format.
 */
export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'focus.db');

  // Get or create encryption key
  const encryptionKey = getOrCreateEncryptionKey();

  const dbExists = existsSync(dbPath);

  // Check if we need to migrate from unencrypted to encrypted
  // Only migrate if: DB exists AND we can open it without key (meaning it's unencrypted)
  let needsMigration = false;
  if (dbExists) {
    try {
      // Try to open database WITHOUT key to see if it's unencrypted
      const testDb = new Database(dbPath);
      testDb.close();

      // Successful open/read means DB is unencrypted - trigger migration
      needsMigration = true;
      console.log('[DB] Migrating unencrypted database to encrypted format');
    } catch {
      // Could not read without key - it's already encrypted
    }
  }

  try {
    if (needsMigration) {
      // Migrate unencrypted database to encrypted format
      const tempDb = new Database(dbPath);
      migrateToEncrypted(tempDb, encryptionKey);
      db = new Database(dbPath);
    } else {
      // Open database (new or already encrypted)
      db = new Database(dbPath);
    }

    // Apply encryption key (required for both new and existing encrypted databases)
    db.exec(`PRAGMA key = "x'${encryptionKey}'"`);
    db.exec('PRAGMA cipher_use_hmac = 1');

    // Verify encryption is working by attempting a simple query
    try {
      db.prepare('SELECT 1').get();
    } catch (verifyError) {
      console.error('[DB] Encryption verification failed:', verifyError);
      throw new Error('Database encryption verification failed - wrong key or corrupted database');
    }

    if (!db) throw new Error('Database not initialized');
    const currentDb = db;

    // Create normalized schema
    currentDb.exec(`
       CREATE TABLE IF NOT EXISTS users (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         email TEXT UNIQUE NOT NULL,
         age INTEGER,
         gender TEXT CHECK(gender IN ('Male', 'Female')),
         is_generic BOOLEAN DEFAULT 0,
         created_at TEXT DEFAULT CURRENT_TIMESTAMP,
         updated_at TEXT DEFAULT CURRENT_TIMESTAMP
       );

       CREATE TABLE IF NOT EXISTS test_sessions (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         user_id INTEGER NOT NULL,
         test_date TEXT DEFAULT CURRENT_TIMESTAMP,
         acs_score REAL,
         acs_interpretation TEXT,
         mean_response_time_ms REAL,
         response_time_variability REAL,
         commission_errors INTEGER,
         omission_errors INTEGER,
         hits INTEGER,
         d_prime REAL,
         validity TEXT,
         validity_reason TEXT,
         total_trials INTEGER,
         test_config TEXT,
         upload_status TEXT DEFAULT 'pending' CHECK(upload_status IN ('pending', 'uploaded', 'failed')),
         uploaded_at TEXT,
         consent_given BOOLEAN NOT NULL DEFAULT 0,
         consent_timestamp TEXT,
         retention_expires_at TEXT GENERATED ALWAYS AS (
           datetime(test_date, '+7 days')
         ) VIRTUAL,
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
       );

        CREATE TABLE IF NOT EXISTS trial_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_session_id INTEGER NOT NULL,
          trial_index INTEGER,
          stimulus_type TEXT,
          outcome TEXT,
          response_correct BOOLEAN,
          response_time_ms REAL,
          is_anticipatory BOOLEAN,
          is_multiple_response BOOLEAN,
          follows_commission BOOLEAN,
          FOREIGN KEY (test_session_id) REFERENCES test_sessions(id) ON DELETE CASCADE
        );
      `);

    currentDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_retention_expires ON test_sessions(retention_expires_at);
        CREATE INDEX IF NOT EXISTS idx_upload_status ON test_sessions(upload_status);
      `);

    // Migration 1: Add outcome column if missing (for databases created before outcome was added)
    const outcomeColumnExists = currentDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='trial_data' AND sql LIKE '%outcome%'"
      )
      .get();
    if (!outcomeColumnExists) {
      console.log('[DB] Migrating trial_data: adding outcome column...');
      try {
        currentDb.exec('ALTER TABLE trial_data ADD COLUMN outcome TEXT');
        console.log('[DB] Added outcome column to trial_data');

        // Backfill outcome values from existing data (stimulus_type + response_correct)
        // Outcome derivation: target+correct=hit, target+no-response=omission,
        // non-target+response=commission, non-target+no-response=correct-rejection
        currentDb.exec(`
            UPDATE trial_data
            SET outcome = CASE
              WHEN stimulus_type = 'target' AND response_correct = 1 THEN 'hit'
              WHEN stimulus_type = 'target' AND response_correct IS NULL THEN 'omission'
              WHEN stimulus_type = 'non-target' AND response_correct = 0 THEN 'commission'
              WHEN stimulus_type = 'non-target' AND response_correct IS NULL THEN 'correct-rejection'
              ELSE NULL
            END
          `);
        console.log('[DB] Backfilled outcome values for existing trial_data');
      } catch (e) {
        console.error('[DB] Failed to add outcome column:', e);
      }
    }

    // Migration from legacy test_results
    const legacyTableExists = currentDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_results'")
      .get();
    if (legacyTableExists) {
      console.log('[DB] Migrating legacy test_results to normalized schema...');
      const legacyResults = currentDb.prepare('SELECT * FROM test_results').all() as LegacyRow[];

      currentDb.transaction(() => {
        for (const row of legacyResults) {
          const testDataParsed = JSON.parse(row.test_data as string);

          // 1. User
          const userStmt = currentDb.prepare(
            'INSERT OR IGNORE INTO users (email, age, gender, is_generic) VALUES (?, ?, ?, ?)'
          );
          userStmt.run(row.email, 25, 'Male', 1);
          const user = currentDb.prepare('SELECT id FROM users WHERE email = ?').get(row.email) as {
            id: number;
          };

          // 2. Trials & Metrics
          // Process test events first to get trial results for metric computation
          const totalTrials = testDataParsed.events.filter(
            (e: any) => e.eventType === 'stimulus-onset'
          ).length;
          const trialResults = processTestEvents(testDataParsed.events, { totalTrials });

          const hits = trialResults.filter((t) => t.outcome === 'hit');
          const omissions = trialResults.filter((t) => t.outcome === 'omission');
          const commissions = trialResults.filter((t) => t.outcome === 'commission');

          const hitRTs = hits.map((t) => t.responseTimeMs || 0);
          const meanRT = calculateMean(hitRTs);
          const variability = calculateStdDevWithMean(hitRTs, meanRT);

          // D-Prime calculation based on second half of trials per ACS methodology
          const halfIndex = Math.floor(trialResults.length / 2);
          const secondHalf = trialResults.slice(halfIndex);
          const shHits = secondHalf.filter((t) => t.outcome === 'hit').length;
          const shFAs = secondHalf.filter((t) => t.outcome === 'commission').length;
          const shTargets = secondHalf.filter((t) => t.stimulusType === 'target').length;
          const shNonTargets = secondHalf.filter((t) => t.stimulusType === 'non-target').length;

          const hitRate = shTargets > 0 ? shHits / shTargets : 0;
          const faRate = shNonTargets > 0 ? shFAs / shNonTargets : 0;
          const dPrime = calculateDPrime(hitRate, faRate);

          // ACS Score & Interpretation
          const normStats = getNormativeStats(25, 'Male');
          let acsScore = 0;
          let acsInterpretation = 'Unknown';

          if (normStats) {
            const rtZ = (meanRT - normStats.responseTimeMean) / normStats.responseTimeSD;
            const varZ = (variability - normStats.variabilityMean) / normStats.variabilitySD;
            const dpZ = (dPrime - normStats.dPrimeMean) / normStats.dPrimeSD;

            acsScore = (rtZ ?? 0) + (varZ ?? 0) + (dpZ ?? 0) + TRIAL_CONSTANTS.ACS_CONSTANT;

            if (acsScore >= TRIAL_CONSTANTS.ACS_NORMAL_THRESHOLD) {
              acsInterpretation = 'Normal';
            } else if (acsScore >= TRIAL_CONSTANTS.ACS_BORDERLINE_THRESHOLD) {
              acsInterpretation = 'Borderline';
            } else {
              acsInterpretation = 'Impaired';
            }
          }

          // Validity check
          const anticipatoryCount = trialResults.filter((t) => t.isAnticipatory).length;
          const anticipatoryPercent = (anticipatoryCount / trialResults.length) * 100;
          const validResponses = hits.length + commissions.length;

          let validity = 'Valid';
          let validityReason = '';
          if (anticipatoryPercent > TRIAL_CONSTANTS.MAX_ANTICIPATORY_PERCENT) {
            validity = 'Invalid';
            validityReason = `Excessive anticipatory responses (${anticipatoryPercent.toFixed(1)}%)`;
          } else if (validResponses < TRIAL_CONSTANTS.MIN_VALID_RESPONSES) {
            validity = 'Invalid';
            validityReason = `Insufficient valid responses (${validResponses})`;
          }

          // 3. Session
          const sessionStmt = currentDb.prepare(`
             INSERT INTO test_sessions (
               user_id, test_date, acs_score, acs_interpretation, mean_response_time_ms, 
               response_time_variability, commission_errors, omission_errors, hits, 
               d_prime, validity, validity_reason, total_trials, test_config, upload_status, 
               consent_given, consent_timestamp
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           `);
          const sessionId = sessionStmt.run(
            user.id,
            row.created_at,
            acsScore,
            acsInterpretation,
            meanRT,
            variability,
            commissions.length,
            omissions.length,
            hits.length,
            dPrime,
            validity,
            validityReason,
            trialResults.length,
            JSON.stringify({}),
            row.upload_status,
            row.consent_given ? 1 : 0,
            row.consent_timestamp
          ).lastInsertRowid;

          // 4. Trials
          const trialStmt = currentDb.prepare(`
              INSERT INTO trial_data (
                test_session_id, trial_index, stimulus_type, outcome,
                response_correct, response_time_ms, is_anticipatory,
                is_multiple_response, follows_commission
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

          for (const trial of trialResults) {
            let responseCorrect: number | null = null;
            if (trial.outcome === 'hit') responseCorrect = 1;
            else if (trial.outcome === 'commission') responseCorrect = 0;

            trialStmt.run(
              sessionId,
              trial.trialIndex,
              trial.stimulusType,
              trial.outcome,
              responseCorrect,
              trial.responseTimeMs,
              trial.isAnticipatory ? 1 : 0,
              trial.isMultipleResponse ? 1 : 0,
              trial.followsCommission ? 1 : 0
            );
          }
        }
      })();
      console.log('[DB] Legacy migration completed successfully');
    }

    // Create test_config table
    currentDb.exec(`
       CREATE TABLE IF NOT EXISTS test_config (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )
     `);

    // Seed default configuration (only if not already seeded)
    currentDb.exec(`
       INSERT OR IGNORE INTO test_config (key, value) VALUES
         ('stimulusDurationMs', '100'),
         ('interstimulusIntervalMs', '2000'),
         ('totalTrials', '648'),
         ('bufferMs', '500')
     `);

    console.log('[DB] Database initialized with SQLCipher encryption');
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
  }
}

// ===========================================
// Database Query Functions
// ===========================================

/**
 * Result of a write query (INSERT/UPDATE/DELETE).
 */
interface WriteResult {
  changes: number;
  lastInsertRowid: number;
}

/**
 * Execute a whitelisted database query.
 *
 * @param command - The query command from the whitelist
 * @param params - Optional parameters for the query
 * @returns Query result based on query type
 * @throws Error if command is invalid or parameters don't match
 */
export function executeWhitelistedQuery(
  command: DatabaseQueryCommand,
  params?: unknown[]
): unknown {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const currentDb = db;

  // Validate command is in whitelist
  if (!(command in queryWhitelist)) {
    throw new Error(`Invalid database command: ${command}`);
  }

  const queryEntry = queryWhitelist[command];

  // Validate parameter count
  const paramCount = params ? params.length : 0;
  if (paramCount !== queryEntry.paramCount) {
    throw new Error(
      `Command '${command}' expects ${queryEntry.paramCount} parameters, got ${paramCount}`
    );
  }

  try {
    const stmt = currentDb.prepare(queryEntry.sql);

    switch (queryEntry.type) {
      case 'select-one':
        return stmt.get(...(params || []));
      case 'select-many':
        return stmt.all(...(params || []));
      case 'write':
        return stmt.run(...(params || [])) as WriteResult;
      default:
        throw new Error(`Unknown query type: ${queryEntry.type}`);
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get the number of test results with a specific upload status.
 *
 * @param status - The upload status to count
 * @returns Number of matching records
 */
export function getUploadCount(status: string): number {
  const result = executeWhitelistedQuery('get-upload-count', [status]) as { count: number };
  return result.count;
}

/**
 * Get all pending test results waiting for upload.
 *
 * @returns Array of pending test results
 */
export function getPendingUploads(): unknown[] {
  return executeWhitelistedQuery('get-pending-uploads', ['pending']) as unknown[];
}

/**
 * Get a specific test result by ID.
 *
 * @param id - The test result ID
 * @returns The test result or undefined if not found
 */
export function getTestResult(id: number): unknown {
  return executeWhitelistedQuery('get-test-result', [id]);
}

/**
 * Delete a test result by ID.
 *
 * @param id - The test result ID
 * @returns true if deleted, false if not found
 */
export function deleteTestResult(id: number): boolean {
  const result = executeWhitelistedQuery('delete-test-result', [id]) as { changes: number };
  return result.changes > 0;
}

/**
 * Get all test results.
 *
 * @returns Array of all test results
 */
export function getAllTestResults(): unknown[] {
  return executeWhitelistedQuery('get-all-test-results') as unknown[];
}

/**
 * Insert a new test result with consent.
 *
 * @param testData - JSON string of test events
 * @param email - Patient email
 * @param consentGiven - Whether consent was given
 * @param consentTimestamp - ISO timestamp of consent
 * @returns The new record ID
 */
export function insertTestResultWithConsent(
  testData: string,
  email: string,
  consentGiven: boolean,
  consentTimestamp: string,
  uploadStatus: string = 'pending'
): number {
  const result = executeWhitelistedQuery('insert-test-result-with-consent', [
    testData,
    email,
    uploadStatus,
    consentGiven ? 1 : 0,
    consentTimestamp,
  ]) as { lastInsertRowid: number };
  return result.lastInsertRowid;
}

/**
 * Update the upload status of a test result.
 *
 * @param id - The test result ID
 * @param status - The new upload status
 * @returns true if updated, false if not found
 */
export function updateTestResultStatus(id: number, status: string): boolean {
  const result = executeWhitelistedQuery('update-test-result', [status, id]) as { changes: number };
  return result.changes > 0;
}
