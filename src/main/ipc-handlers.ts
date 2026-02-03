/**
 * F.O.C.U.S. Clinical Attention Test - IPC Handlers
 * 
 * All IPC handler registrations for main-renderer communication.
 */

import { ipcMain } from 'electron';
import { DatabaseQueryCommand, TestConfig } from './types';
import { queryWhitelist, db, insertTestResultWithConsent } from './database';
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

/**
 * Save test result with explicit consent (GDPR compliant).
 */
ipcMain.handle('save-test-result-with-consent', async (
  _event: Electron.IpcMainInvokeEvent, 
  testData: string, 
  email: string, 
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
    const result = insertTestResultWithConsent(testData, email, consentGiven, consentTimestamp, 'pending');
    console.log(`Test result saved with consent. ID: ${result}, Email: ${email}, Consent: ${consentGiven}`);
    return result;
  } catch (error) {
    console.error('Failed to save test result with consent:', error);
    throw error;
  }
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
