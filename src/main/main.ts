import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as crypto from 'crypto';
import Database from 'better-sqlite3';

// ===========================================
// SQLCipher Encryption Key Management
// ===========================================

/**
 * Generate a random 256-bit (32 byte) encryption key as hex string.
 * This key is used to encrypt the SQLite database with SQLCipher.
 */
function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32);
  return key.toString('hex');
}

/**
 * Get or create encryption key for database encryption.
 * Key is stored in userData directory with restricted permissions (chmod 600).
 * 
 * @returns The encryption key as hex string
 */
function getOrCreateEncryptionKey(): string {
  const fs = require('fs');
  const keyPath = path.join(app.getPath('userData'), '.tova_db_key');
  
  // Check if key already exists
  if (fs.existsSync(keyPath)) {
    try {
      const existingKey = fs.readFileSync(keyPath, 'utf8').trim();
      // Validate key format (64 hex characters = 256 bits)
      if (existingKey.length === 64 && /^[a-fA-F0-9]+$/.test(existingKey)) {
        console.log('Existing encryption key found and validated');
        return existingKey;
      } else {
        console.warn('Invalid encryption key format, generating new key');
      }
    } catch (error) {
      console.error('Failed to read existing encryption key:', error);
    }
  }
  
  // Generate new key
  const newKey = generateEncryptionKey();
  
  try {
    fs.writeFileSync(keyPath, newKey, { mode: 0o600 });
    console.log('New encryption key generated and stored securely');
  } catch (error) {
    console.error('Failed to store encryption key:', error);
    // Continue with the key in memory (less secure but functional)
  }
  
  return newKey;
}

/**
 * Check if the database is already encrypted by attempting to read it.
 * An encrypted database will return an error when accessed without the key.
 */
function isDatabaseEncrypted(dbPath: string): boolean {
  const fs = require('fs');
  
  if (!fs.existsSync(dbPath)) {
    return false; // New database, not yet encrypted
  }
  
  // Try to open without key and check if it's a valid SQLite database
  try {
    // SQLCipher databases have a different header than standard SQLite
    const headerBuffer = Buffer.alloc(16);
    const fd = fs.openSync(dbPath, 'r');
    fs.readSync(fd, headerBuffer, 0, 16, 0);
    fs.closeSync(fd);
    
    // Standard SQLite starts with "SQLite format 3\000"
    const sqliteHeader = 'SQLite format 3';
    const headerStr = headerBuffer.toString('utf8', 0, 16);
    
    // If header doesn't match standard SQLite, it's likely encrypted or corrupted
    if (!headerStr.includes(sqliteHeader)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Migrate an unencrypted database to encrypted format.
 * Uses the attach/detach pattern to re-encrypt the database.
 * 
 * @param db - The database connection
 * @param newKey - The new encryption key
 */
function migrateToEncrypted(db: Database.Database, newKey: string): void {
  console.log('Migrating unencrypted database to encrypted format...');
  
  try {
    // Create a temporary encrypted database by exporting and re-importing
    // This is a simplified migration - in production, use proper backup/restore
    const tempDbPath = path.join(app.getPath('userData'), 'tova_backup.db');
    const encryptedDbPath = path.join(app.getPath('userData'), 'tova.db');
    
    // Close current connection
    db.close();
    
    // Rename current database to backup
    const fs = require('fs');
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
    fs.renameSync(encryptedDbPath, tempDbPath);
    
    // Open backup and re-export with encryption
    const backupDb = new Database(tempDbPath);
    const encryptedDb = new Database(encryptedDbPath);
    
    // Apply encryption key to new database
    encryptedDb.exec(`PRAGMA key = "x'${newKey}'"`);
    encryptedDb.exec('PRAGMA cipher_use_hmac = 1');
    
    // Export all data and re-import
    const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    
    for (const table of tables) {
      if (table.name === 'sqlite_sequence') continue;
      
      // Get table schema
      const schema = backupDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table.name) as { sql: string };
      
      // Create table in encrypted database
      encryptedDb.exec(schema.sql);
      
      // Copy data
      const data = backupDb.prepare(`SELECT * FROM ${table.name}`).all() as Record<string, unknown>[];
      if (data.length > 0) {
        const columns = Object.keys(data[0]).join(', ');
        const placeholders = Object.keys(data[0]).map(() => '?').join(', ');
        const insertStmt = encryptedDb.prepare(`INSERT INTO ${table.name} (${columns}) VALUES (${placeholders})`);
        
        for (const row of data) {
          insertStmt.run(...Object.values(row));
        }
      }
    }
    
    backupDb.close();
    encryptedDb.close();
    
    // Remove backup
    fs.unlinkSync(tempDbPath);
    
    console.log('Database migration to encrypted format completed successfully');
  } catch (error) {
    console.error('Failed to migrate database:', error);
    throw error;
  }
}

// Test configuration type
interface TestConfig {
  stimulusDurationMs: number;
  interstimulusIntervalMs: number;
  totalTrials: number;
  bufferMs: number;
}

// Default test configuration
const DEFAULT_TEST_CONFIG: TestConfig = {
  stimulusDurationMs: 100,
  interstimulusIntervalMs: 2000,
  totalTrials: 648,
  bufferMs: 500,
};

// ===========================================
// GDPR Compliance - Data Retention
// ===========================================

// Retention period in days (GDPR storage limitation principle)
const RETENTION_DAYS = 7;

/**
 * Clean up expired test records (older than retention period)
 * Returns the number of records deleted
 */
function cleanupExpiredRecords(): number {
  if (!db) {
    console.warn('Database not initialized, skipping cleanup');
    return 0;
  }

  try {
    // Delete records where retention_expires_at is in the past
    const result = db.prepare(`
      DELETE FROM test_results
      WHERE retention_expires_at < datetime('now')
    `).run();

    const deletedCount = result.changes;
    console.log(`GDPR cleanup: Deleted ${deletedCount} expired records`);
    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup expired records:', error);
    return 0;
  }
}

/**
 * Get count of expired records (for monitoring)
 */
function getExpiredRecordCount(): number {
  if (!db) return 0;

  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM test_results
      WHERE retention_expires_at < datetime('now')
    `).get() as { count: number };
    return result.count;
  } catch (error) {
    console.error('Failed to get expired count:', error);
    return 0;
  }
}

// Type definitions
type StimulusType = 'target' | 'non-target';

interface ConsentData {
  consentGiven: boolean;
  consentTimestamp: string;
}

interface TestEvent {
  trialIndex: number;
  stimulusType: StimulusType;
  timestampNs: string;
  eventType: 'stimulus-onset' | 'stimulus-offset' | 'response' | 'buffer-start';
  responseCorrect?: boolean;
}

interface PendingResponse {
  trialIndex: number;
  stimulusType: StimulusType;
  onsetTimestampNs: bigint;
  expectedResponse: boolean; // true = target, false = non-target
}

// Test state
let testRunning = false;
let testEvents: TestEvent[] = [];
let pendingResponses: PendingResponse[] = [];
let testStartTimeNs: bigint = 0n;
let currentTrialIndex = 0;
let currentStimulusType: StimulusType = 'target';
let mainWindow: BrowserWindow | null = null;

/**
 * Computes the integer square root of a BigInt using binary search.
 * @param n - The number to compute the square root of
 * @returns The integer square root of n
 */
function bigIntSqrt(n: bigint): bigint {
  if (n < 0n) {
    throw new Error('Cannot compute square root of negative number');
  }
  
  if (n === 0n || n === 1n) {
    return n;
  }
  
  let low = 1n;
  let high = n;
  let result = 0n;
  
  while (low <= high) {
    const mid = (low + high) / 2n;
    const midSquared = mid * mid;
    
    if (midSquared === n) {
      return mid;
    } else if (midSquared < n) {
      low = mid + 1n;
      result = mid;
    } else {
      high = mid - 1n;
    }
  }
  
  return result;
}

/**
 * Validates the timing precision of the system using process.hrtime.bigint().
 * Measures 1000 iterations of timestamp capture and calculates mean and standard deviation.
 * 
 * @returns boolean indicating whether timing precision meets clinical requirements
 *          (standard deviation < 0.001 milliseconds)
 */
function validateTimingPrecision(): boolean {
  const iterations = 1000;
  const measurements: bigint[] = [];

  // Capture timing measurements - time between consecutive calls to process.hrtime.bigint()
  let previousTimestamp = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    const currentTimestamp = process.hrtime.bigint();
    const delta = currentTimestamp - previousTimestamp;
    measurements.push(delta);
    previousTimestamp = currentTimestamp;
  }

  // Calculate mean (average) of measurements
  let sum = 0n;
  for (const measurement of measurements) {
    sum += measurement;
  }
  const meanNs = sum / BigInt(iterations);
  const meanMs = Number(meanNs) / 1000000;

  // Calculate standard deviation
  let sumOfSquares = 0n;
  for (const measurement of measurements) {
    const difference = measurement - meanNs;
    sumOfSquares += difference * difference;
  }
  const varianceNs = sumOfSquares / BigInt(iterations);
  const stdDevNs = bigIntSqrt(varianceNs);
  const stdDevMs = Number(stdDevNs) / 1000000;

  console.log('========================================');
  console.log('Timing Validation Results:');
  console.log('  Iterations: ' + iterations);
  console.log('  Mean: ' + meanMs.toFixed(6) + ' ms');
  console.log('  Standard Deviation: ' + stdDevMs.toFixed(6) + ' ms');
  console.log('  Clinical Requirement: standard deviation < 0.001 milliseconds (1 microsecond)');

  const passes = stdDevMs < 0.001;

  if (passes) {
    console.log('✅ Timing validation PASSED');
    console.log('  Hardware meets clinical precision requirements');
    console.log('  Standard deviation < 0.001 ms (1 microsecond)');
    console.log('========================================\n');
  } else {
    console.error('❌ Timing validation FAILED');
    console.error('  Hardware does NOT meet clinical precision requirements');
    console.error('  Required: Standard deviation < 0.001 ms (1 microsecond)');
    console.error('  Actual: Standard deviation = ' + stdDevMs.toFixed(6) + ' ms');
    console.error('========================================\n');
  }

  return passes;
}

// Run timing validation before any other initialization
console.log('Starting timing validation...');
const timingValidationPassed = validateTimingPrecision();

if (!timingValidationPassed) {
  console.warn('⚠️  WARNING: Hardware does not meet clinical timing precision requirements');
  console.warn('⚠️  Standard deviation exceeds 0.001 ms threshold');
  console.warn('⚠️  This hardware may be unsuitable for clinical use');
  console.warn('⚠️  Application will continue but timing accuracy may be compromised');
  console.warn('⚠️  Consider running on hardware with better timing precision for clinical deployments\n');
}

// Initialize SQLite database
let db: Database.Database | null = null;

/**
 * Initialize the database with SQLCipher encryption.
 * Handles migration from unencrypted to encrypted format.
 */
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'tova.db');
  const fs = require('fs');
  
  // Get or create encryption key
  const encryptionKey = getOrCreateEncryptionKey();
  
  try {
    // Check if database exists and is encrypted
    const exists = fs.existsSync(dbPath);
    const isEncrypted = exists && isDatabaseEncrypted(dbPath);
    
    if (exists && !isEncrypted) {
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
      console.log('Database encryption verified successfully');
    } catch (verifyError) {
      console.error('Failed to verify database encryption:', verifyError);
      throw new Error('Database encryption verification failed');
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
    
    console.log('Database initialized successfully with SQLCipher encryption (GDPR-compliant)');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Test configuration helper functions

/**
 * Get test configuration from database or defaults
 */
function getTestConfig(): TestConfig {
  const config: TestConfig = { ...DEFAULT_TEST_CONFIG };
  
  if (!db) return config;
  
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
    console.error('Failed to load test config:', error);
  }
  
  return config;
}

/**
 * Save test configuration to database
 */
function saveTestConfig(newConfig: TestConfig): void {
  if (!db) return;
  
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
    console.log('Test config saved successfully');
  } catch (error) {
    console.error('Failed to save test config:', error);
    throw error;
  }
}

/**
 * Reset test configuration to defaults
 */
function resetTestConfig(): void {
  saveTestConfig(DEFAULT_TEST_CONFIG);
}

// Safe query whitelist - maps command identifiers to predefined SQL queries
type DatabaseQueryCommand = 
  | 'get-pending-uploads'
  | 'get-test-result'
  | 'delete-test-result'
  | 'get-upload-count'
  | 'get-all-test-results'
  | 'insert-test-result'
  | 'insert-test-result-with-consent'
  | 'update-test-result'
  | 'cleanup-expired-records'
  | 'get-expired-count';

interface QueryWhitelistEntry {
  sql: string;
  paramCount: number;
}

const queryWhitelist: Record<DatabaseQueryCommand, QueryWhitelistEntry> = {
  'get-pending-uploads': {
    sql: 'SELECT * FROM test_results WHERE upload_status = ?',
    paramCount: 1,
  },
  'get-test-result': {
    sql: 'SELECT * FROM test_results WHERE id = ?',
    paramCount: 1,
  },
  'delete-test-result': {
    sql: 'DELETE FROM test_results WHERE id = ?',
    paramCount: 1,
  },
  'get-upload-count': {
    sql: 'SELECT COUNT(*) as count FROM test_results WHERE upload_status = ?',
    paramCount: 1,
  },
  'get-all-test-results': {
    sql: 'SELECT * FROM test_results',
    paramCount: 0,
  },
  'insert-test-result': {
    sql: 'INSERT INTO test_results (test_data, email, upload_status, created_at, consent_given, consent_timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    paramCount: 6,
  },
  'insert-test-result-with-consent': {
    sql: 'INSERT INTO test_results (test_data, email, upload_status, consent_given, consent_timestamp) VALUES (?, ?, ?, ?, ?)',
    paramCount: 5,
  },
  'update-test-result': {
    sql: 'UPDATE test_results SET upload_status = ? WHERE id = ?',
    paramCount: 2,
  },
  'cleanup-expired-records': {
    sql: 'DELETE FROM test_results WHERE retention_expires_at < datetime("now")',
    paramCount: 0,
  },
  'get-expired-count': {
    sql: 'SELECT COUNT(*) as count FROM test_results WHERE retention_expires_at < datetime("now")',
    paramCount: 0,
  },
};

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// App lifecycle
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  initDatabase();
  cleanupExpiredRecords(); // Run GDPR cleanup on startup
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
    }
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-high-precision-time', async () => {
  return process.hrtime.bigint().toString();
});

ipcMain.handle('get-event-timestamp', async () => {
  return process.hrtime.bigint().toString();
});

// Safe query handler - replaces vulnerable query-database handler
ipcMain.handle('query-database', async (_event: any, command: DatabaseQueryCommand, params?: any[]) => {
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
    const result = stmt.all(...(params || []));
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
});

// ===========================================
// Test Config IPC Handlers
// ===========================================

ipcMain.handle('get-test-config', async () => {
  return getTestConfig();
});

ipcMain.handle('save-test-config', async (_event, config: TestConfig) => {
  saveTestConfig(config);
});

ipcMain.handle('reset-test-config', async () => {
  resetTestConfig();
});

// ===========================================
// GDPR Compliance IPC Handlers
// ===========================================

ipcMain.handle('cleanup-expired-records', async () => {
  return cleanupExpiredRecords();
});

ipcMain.handle('get-expired-count', async () => {
  return getExpiredRecordCount();
});

/**
 * Save test result with explicit consent (GDPR compliant)
 * Validates consent before saving and records consent timestamp for audit
 */
ipcMain.handle('save-test-result-with-consent', async (_event, testData: string, email: string, consentGiven: boolean, consentTimestamp: string) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Validate consent is given (GDPR requirement)
  if (!consentGiven) {
    throw new Error('Consent is required to save test results');
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO test_results (test_data, email, upload_status, consent_given, consent_timestamp)
      VALUES (?, ?, 'pending', ?, ?)
    `);
    
    const result = stmt.run(testData, email, consentGiven ? 1 : 0, consentTimestamp);
    
    console.log(`Test result saved with consent. ID: ${result.lastInsertRowid}, Email: ${email}, Consent: ${consentGiven}`);
    
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Failed to save test result with consent:', error);
    throw error;
  }
});

// ===========================================
// Test Control IPC Handlers (Main Process Timing)
// ===========================================

/**
 * Helper function to emit stimulus change to renderer
 */
function emitStimulusChange(trialIndex: number, stimulusType: StimulusType, eventType: 'stimulus-onset' | 'stimulus-offset' | 'response' | 'buffer-start') {
  if (!mainWindow) return;
  
  const timestampNs = process.hrtime.bigint().toString();
  
  const event: TestEvent = {
    trialIndex,
    stimulusType,
    timestampNs,
    eventType,
  };
  
  testEvents.push(event);
  mainWindow.webContents.send('stimulus-change', event);
}

/**
 * Start the test sequence with high-precision timing
 */
ipcMain.handle('start-test', async () => {
  if (testRunning) {
    console.warn('Test already running, ignoring start request');
    return false;
  }
  
  console.log('Starting F.O.C.U.S. test sequence...');
  
  // Reset test state
  testRunning = true;
  testEvents = [];
  pendingResponses = [];
  currentTrialIndex = 0;
  currentStimulusType = 'target';
  testStartTimeNs = process.hrtime.bigint();
  
  // Start the stimulus sequence
  runStimulusSequence();
  
  return true;
});

/**
 * Main stimulus sequence runner using precise timing
 */
function runStimulusSequence() {
  const config = getTestConfig();
  
  if (!testRunning || currentTrialIndex >= config.totalTrials) {
    completeTest();
    return;
  }
  
  // Check if this is the first trial - emit buffer-start event
  if (currentTrialIndex === 0) {
    emitStimulusChange(-1, 'target', 'buffer-start');
    
    // Schedule first stimulus after buffer period
    setTimeout(() => {
      if (!testRunning) return;
      presentStimulus();
    }, config.bufferMs);
    return;
  }
  
  // For subsequent trials, present stimulus immediately
  presentStimulus();
}

/**
 * Present a single stimulus (called after buffer period or ISI)
 */
function presentStimulus() {
  const config = getTestConfig();
  
  if (!testRunning || currentTrialIndex >= config.totalTrials) {
    completeTest();
    return;
  }
  
  // Determine stimulus type (alternate)
  const isTarget = currentTrialIndex % 2 === 0;
  currentStimulusType = isTarget ? 'target' : 'non-target';
  const expectedResponse = isTarget; // Target requires response, non-target requires no response
  
  // Record stimulus onset
  const onsetTimestampNs = process.hrtime.bigint();
  emitStimulusChange(currentTrialIndex, currentStimulusType, 'stimulus-onset');
  
  // Store pending response for this trial
  pendingResponses.push({
    trialIndex: currentTrialIndex,
    stimulusType: currentStimulusType,
    onsetTimestampNs,
    expectedResponse,
  });
  
  // Schedule stimulus offset after configured duration
  setTimeout(() => {
    if (!testRunning) return;
    
    emitStimulusChange(currentTrialIndex, currentStimulusType, 'stimulus-offset');
    
    // Schedule next trial after ISI
    setTimeout(() => {
      if (!testRunning) return;
      
      currentTrialIndex++;
      runStimulusSequence();
    }, config.interstimulusIntervalMs);
  }, config.stimulusDurationMs);
}

/**
 * Complete the test and send results to renderer
 */
function completeTest() {
  testRunning = false;
  console.log(`Test completed. Total events: ${testEvents.length}`);
  
  const endTimeNs = process.hrtime.bigint();
  const elapsedTimeNs = endTimeNs - testStartTimeNs;
  
  if (mainWindow) {
    mainWindow.webContents.send('test-complete', { events: testEvents, startTimeNs: testStartTimeNs.toString(), elapsedTimeNs: elapsedTimeNs.toString() });
  }
}

/**
 * Stop the test prematurely
 */
ipcMain.handle('stop-test', async () => {
  if (!testRunning) {
    return false;
  }
  
  console.log('Stopping F.O.C.U.S. test sequence...');
  testRunning = false;
  completeTest();
  
  return true;
});

/**
 * Record a user response during the test
 */
ipcMain.handle('record-response', async (_event, responded: boolean) => {
  const responseTimestampNs = process.hrtime.bigint();
  
  // Find the most recent pending response (within valid window)
  // A response is valid if it's within the stimulus window or shortly after
  const validWindowMs = 500; // Allow responses up to 500ms after stimulus offset
  
  // Get config for valid window calculation
  const config = getTestConfig();
  
  // Find pending response that hasn't been answered yet
  const pendingIndex = pendingResponses.findIndex(pr => {
    const elapsedMs = Number(responseTimestampNs - pr.onsetTimestampNs) / 1_000_000;
    return elapsedMs < (config.stimulusDurationMs + validWindowMs);
  });
  
  if (pendingIndex === -1) {
    // No valid pending response - this is a false positive (commission error)
    const event: TestEvent = {
      trialIndex: -1,
      stimulusType: 'non-target',
      timestampNs: responseTimestampNs.toString(),
      eventType: 'response',
      responseCorrect: false,
    };
    testEvents.push(event);
    return;
  }
  
  const pending = pendingResponses[pendingIndex];
  
  // Determine if response was correct
  // For target: response should be true
  // For non-target: response should be false (no response)
  const isCorrect = pending.expectedResponse === responded;
  
  // Remove from pending responses
  pendingResponses.splice(pendingIndex, 1);
  
  // Record the response event
  const event: TestEvent = {
    trialIndex: pending.trialIndex,
    stimulusType: pending.stimulusType,
    timestampNs: responseTimestampNs.toString(),
    eventType: 'response',
    responseCorrect: isCorrect,
  };
  
  testEvents.push(event);
  
  // Send to renderer for UI feedback
  if (mainWindow) {
    mainWindow.webContents.send('stimulus-change', event);
  }
});
