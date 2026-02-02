import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import Database from 'better-sqlite3';

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

// Type definitions
type StimulusType = 'target' | 'non-target';

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

function initDatabase() {
  try {
    db = new Database(path.join(app.getPath('userData'), 'tova.db'));
    
    // Create test_results table
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_data TEXT NOT NULL,
        email TEXT NOT NULL,
        upload_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create test_config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    console.log('Database initialized successfully');
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
  | 'update-test-result';

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
    sql: 'INSERT INTO test_results (test_data, email, upload_status, created_at) VALUES (?, ?, ?, ?)',
    paramCount: 4,
  },
  'update-test-result': {
    sql: 'UPDATE test_results SET upload_status = ? WHERE id = ?',
    paramCount: 2,
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
  
  console.log('Starting TOVA test sequence...');
  
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
  
  console.log('Stopping TOVA test sequence...');
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
