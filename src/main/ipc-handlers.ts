/**
 * F.O.C.U.S. Assessment - IPC Handlers
 * 
 * All IPC handler registrations for main-renderer communication.
 */

import { ipcMain } from 'electron';
import { DatabaseQueryCommand, TestConfig, SessionWithUser, TrialData } from './types';
import { queryWhitelist, db } from './database';
import { getTestConfig, saveTestConfig, resetTestConfig } from './test-config';
import { cleanupExpiredRecords, getExpiredRecordCount, isValidEmail } from './gdpr';
import { 
  getHighPrecisionTimeString, 
  TIMING_VALIDATION_PASSED 
} from './timing';
import { 
  startTest, 
  stopTest, 
  recordResponse, 
  setMainWindow 
} from './test-engine';
import { computeSummaryMetrics } from './acs-computation';

// ===========================================
// Timing Handlers
// ===========================================

/**
 * Get high-precision timestamp for renderer.
 */
ipcMain.handle('get-high-precision-time', async () => {
  return getHighPrecisionTimeString();
});

/**
 * Get event timestamp for renderer.
 */
ipcMain.handle('get-event-timestamp', async () => {
  return getHighPrecisionTimeString();
});

// ===========================================
// Database Query Handler
// ===========================================

/**
 * Safe query handler - executes whitelisted database queries.
 */
ipcMain.handle('query-database', async (
  _event: Electron.IpcMainInvokeEvent, 
  command: DatabaseQueryCommand, 
  params?: unknown[]
) => {
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
    
    // Use appropriate execution method based on query type
    switch (queryEntry.type) {
      case 'select-one':
        return stmt.get(...(params || []));
      case 'select-many':
        return stmt.all(...(params || []));
      case 'write':
        return stmt.run(...(params || []));
      default:
        throw new Error(`Unknown query type: ${queryEntry.type}`);
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
});

// ===========================================
// Test Config Handlers
// ===========================================

ipcMain.handle('get-test-config', async () => {
  return getTestConfig();
});

ipcMain.handle('save-test-config', async (_event: Electron.IpcMainInvokeEvent, config: TestConfig) => {
  try {
    saveTestConfig(config);
  } catch (error) {
    console.error('Failed to save test config:', error);
    throw error;
  }
});

ipcMain.handle('reset-test-config', async () => {
  try {
    resetTestConfig();
  } catch (error) {
    console.error('Failed to reset test config:', error);
    throw error;
  }
});

// ===========================================
// GDPR Compliance Handlers
// ===========================================

ipcMain.handle('cleanup-expired-records', async () => {
  return cleanupExpiredRecords();
});

ipcMain.handle('get-expired-count', async () => {
  return getExpiredRecordCount();
});

// ===========================================
// Data Saving Handler
// ===========================================

/**
 * Save test result with explicit consent (GDPR compliant).
 * Computes ACS metrics and stores in normalized schema.
 */
ipcMain.handle('save-test-result-with-consent', async (
  _event: Electron.IpcMainInvokeEvent,
  testData: string,
  email: string,
  age: number,
  gender: 'Male' | 'Female',
  consentGiven: boolean,
  consentTimestamp: string
) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Validate consent is given (GDPR requirement)
  if (!consentGiven) {
    throw new Error('Consent is required to save test results');
  }

  // Validate email format
  if (!email || !isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  try {
    const data = JSON.parse(testData);
    const events = Array.isArray(data) ? data : data.events;
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid test data format: expected events array');
    }
    const metrics = computeSummaryMetrics(events, age, gender);

    // Use transaction for normalized save
    const result = db.transaction(() => {
      const currentDb = db!;
      // 1. Insert or get user
      const userStmt = currentDb.prepare('INSERT OR IGNORE INTO users (email, age, gender, is_generic) VALUES (?, ?, ?, ?)');
      userStmt.run(email, age, gender, 0); // is_generic=0 for user-provided demographics
      const user = currentDb.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number };

      // 2. Insert test session
      const sessionStmt = currentDb.prepare(`
        INSERT INTO test_sessions (
          user_id, test_date, acs_score, acs_interpretation,
          mean_response_time_ms, response_time_variability,
          commission_errors, omission_errors, hits, d_prime,
          validity, validity_reason, total_trials, test_config,
          upload_status, consent_given, consent_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const sessionId = sessionStmt.run(
        user.id,
        new Date().toISOString(),
        metrics.acsScore,
        metrics.acsInterpretation,
        metrics.meanResponseTimeMs,
        metrics.responseTimeVariability,
        metrics.commissionErrors,
        metrics.omissionErrors,
        metrics.hits,
        metrics.dPrime,
        metrics.validity,
        metrics.validityReason || null,
        metrics.totalTrials,
        JSON.stringify({}), // test_config placeholder
        'pending',
        consentGiven ? 1 : 0,
        consentTimestamp
      ).lastInsertRowid;

       // 3. Insert trial data
       const trialStmt = currentDb.prepare(`
         INSERT INTO trial_data (
           test_session_id, trial_index, stimulus_type,
           response_correct, response_time_ms, is_anticipatory
         ) VALUES (?, ?, ?, ?, ?, ?)
       `);
       for (const event of events) {
         if (event.eventType === 'response') {
           // Convert booleans to numbers for SQLite (booleans not directly bindable)
           const responseCorrect = event.responseCorrect === true ? 1 : event.responseCorrect === false ? 0 : null;
           const isAnticipatory = event.isAnticipatory ? 1 : 0;
           trialStmt.run(
             sessionId,
             event.trialIndex,
             event.stimulusType,
             responseCorrect,
             event.responseTimeMs ?? null,
             isAnticipatory
           );
         }
       }

      return sessionId;
    })();

    console.log(`Test result saved with consent. ID: ${result}, Email: ${email}`);
    return result;
  } catch (error) {
    console.error('Failed to save test result with consent:', error);
    throw error;
  }
});

// ===========================================
// Data Management Handlers
// ===========================================

ipcMain.handle('get-all-sessions', async () => {
  if (!db) throw new Error('Database not initialized');
  const currentDb = db;
  return currentDb.prepare(`
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
  `).all() as SessionWithUser[];
});

ipcMain.handle('get-session-with-user', async (_event, sessionId: number) => {
  if (!db) throw new Error('Database not initialized');
  const currentDb = db;
  return currentDb.prepare(`
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
  `).get(sessionId) as SessionWithUser | undefined;
});

ipcMain.handle('get-session-trials', async (_event, sessionId: number) => {
  if (!db) throw new Error('Database not initialized');
  const currentDb = db;
  return currentDb.prepare(`
    SELECT id, test_session_id, trial_index, stimulus_type,
           response_correct, response_time_ms, is_anticipatory,
           is_multiple_response, follows_commission
    FROM trial_data
    WHERE test_session_id = ?
    ORDER BY trial_index ASC
  `).all(sessionId) as TrialData[];
});

ipcMain.handle('update-session-status', async (_event, sessionId: number, status: 'pending' | 'uploaded' | 'failed') => {
  if (!db) throw new Error('Database not initialized');
  const currentDb = db;
  const uploadedAt = status === 'uploaded' ? new Date().toISOString() : null;
  currentDb.prepare(`
    UPDATE test_sessions 
    SET upload_status = ?, uploaded_at = ?
    WHERE id = ?
  `).run(status, uploadedAt, sessionId);
});

ipcMain.handle('bulk-delete-sessions', async (_event, sessionIds: number[]) => {
  if (!db) throw new Error('Database not initialized');
  const currentDb = db;
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return { deleted: 0 };
  }
  return currentDb.transaction(() => {
    let deleted = 0;
    for (const id of sessionIds) {
      const result = currentDb.prepare('DELETE FROM test_sessions WHERE id = ?').run(id);
      deleted += result.changes;
    }
    return { deleted };
  })();
});

// ===========================================
// Test Control Handlers
// ===========================================

ipcMain.handle('start-test', async () => {
  return startTest();
});

ipcMain.handle('stop-test', async () => {
  return stopTest();
});

ipcMain.handle('record-response', async (_event: Electron.IpcMainInvokeEvent, responded: boolean) => {
  recordResponse(responded);
});

// ===========================================
// Initialization Helpers
// ===========================================

/**
 * Register all IPC handlers.
 * Call this after window is created and database is initialized.
 * 
 * @param mainWindow - The main BrowserWindow instance
 */
export function registerAllIpcHandlers(mainWindow: Electron.BrowserWindow): void {
  // Set the window reference for test engine events
  setMainWindow(mainWindow);
  
  // Log registration status
  console.log('IPC handlers registered successfully');
  console.log(`  - Timing validation passed: ${TIMING_VALIDATION_PASSED}`);
}
