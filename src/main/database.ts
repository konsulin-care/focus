/**
 * F.O.C.U.S. Assessment - Database Module
 * 
 * Database initialization with SQLCipher encryption and query whitelist.
 * Uses better-sqlite3 for local data persistence.
 */

import * as path from 'path';
import { app } from 'electron';
import Database from 'better-sqlite3';
import { 
  DatabaseQueryCommand, 
  QueryWhitelistEntry
} from './types';
import { 
  getOrCreateEncryptionKey, 
  migrateToEncrypted 
} from './encryption';

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
    sql: 'DELETE FROM test_results WHERE retention_expires_at < datetime("now")',
    paramCount: 0,
    type: 'write',
  },
  'get-expired-count': {
    sql: 'SELECT COUNT(*) as count FROM test_results WHERE retention_expires_at < datetime("now")',
    paramCount: 0,
    type: 'select-one',
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
  const fs = require('fs');
  
  // Get or create encryption key
  const encryptionKey = getOrCreateEncryptionKey();
  
  const dbExists = fs.existsSync(dbPath);
  
  // Check if we need to migrate from unencrypted to encrypted
  // Only migrate if: DB exists AND we can open it without key (meaning it's unencrypted)
  let needsMigration = false;
  if (dbExists) {
    try {
      // Try to open database WITHOUT key to see if it's unencrypted
      const testDb = new Database(dbPath);
      const result = testDb.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="test_config"').get();
      testDb.close();
      
      if (result) {
        // We could read from it without a key - it's unencrypted
        needsMigration = true;
        console.log('[DB] Migrating unencrypted database to encrypted format');
      }
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
    
    // Create test_results table with GDPR-compliant schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_data TEXT NOT NULL,
        email TEXT NOT NULL,
        upload_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        consent_given BOOLEAN NOT NULL DEFAULT 0,
        consent_timestamp TEXT,
        retention_expires_at TEXT GENERATED ALWAYS AS (
          datetime(created_at, '+7 days')
        ) VIRTUAL
      )
    `);
    
    // Create indexes for cleanup queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_retention_expires ON test_results(retention_expires_at);
      CREATE INDEX IF NOT EXISTS idx_upload_status ON test_results(upload_status);
    `);
    
    // Create test_config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    // Seed default configuration (only if not already seeded)
    db.exec(`
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

  // Validate command is in whitelist
  if (!(command in queryWhitelist)) {
    throw new Error(`Invalid database command: ${command}`);
  }

  const queryEntry = queryWhitelist[command];
  
  // Validate parameter count
  const paramCount = params ? params.length : 0;
  if (paramCount !== queryEntry.paramCount) {
    throw new Error(`Command '${command}' expects ${queryEntry.paramCount} parameters, got ${paramCount}`);
  }

  try {
    const stmt = db.prepare(queryEntry.sql);
    
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
  const result = executeWhitelistedQuery(
    'get-upload-count',
    [status]
  ) as { count: number };
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
  const result = executeWhitelistedQuery(
    'delete-test-result',
    [id]
  ) as { changes: number };
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
  const result = executeWhitelistedQuery(
    'insert-test-result-with-consent',
    [testData, email, uploadStatus, consentGiven ? 1 : 0, consentTimestamp]
  ) as { lastInsertRowid: number };
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
  const result = executeWhitelistedQuery(
    'update-test-result',
    [status, id]
  ) as { changes: number };
  return result.changes > 0;
}
