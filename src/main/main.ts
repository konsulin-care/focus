/**
 * F.O.C.U.S. Assessment - Main Entry Point
 * 
 * Composition root for the Electron application.
 * Orchestrates initialization of all modules.
 */

import { app, BrowserWindow } from 'electron';
import { initDatabase } from './database';
import { cleanupExpiredRecords } from './gdpr';
import { TIMING_VALIDATION_PASSED } from './timing';
import { createWindow, setApplicationMenu } from './window';
import { registerAllIpcHandlers } from './ipc-handlers';

// ===========================================
// Timing Validation Warning
// ===========================================

if (!TIMING_VALIDATION_PASSED) {
  console.warn('⚠️  WARNING: Hardware does not meet clinical timing precision requirements');
  console.warn('⚠️  Standard deviation exceeds 0.001 ms threshold');
  console.warn('⚠️  This hardware may be unsuitable for clinical use');
  console.warn('⚠️  Application will continue but timing accuracy may be compromised');
  console.warn('⚠️  Consider running on hardware with better timing precision for clinical deployments\n');
}

// ===========================================
// Application Lifecycle
// ===========================================

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  // Set application menu (null = no menu)
  setApplicationMenu();
  
  // Initialize database
  initDatabase();
  
  // Run GDPR cleanup on startup
  cleanupExpiredRecords();
  
  // Create main window
  mainWindow = createWindow();
  
  // Register IPC handlers
  registerAllIpcHandlers(mainWindow);
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      registerAllIpcHandlers(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
