/**
 * F.O.C.U.S. Assessment - Main Entry Point
 *
 * Composition root for the Electron application.
 * Orchestrates initialization of all modules.
 */

import { app, BrowserWindow } from 'electron';
import { initDatabase, db } from './database';
import { initAuth, invalidateAllSessions, isAdminSetup } from './auth';
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
  console.warn(
    '⚠️  Consider running on hardware with better timing precision for clinical deployments\n'
  );
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

  // Initialize auth
  initAuth();

  // Run GDPR cleanup on startup
  cleanupExpiredRecords();

  // Log admin setup status on startup
  setTimeout(() => {
    try {
      const setupComplete = isAdminSetup();

      // Count registered admin
      let adminCount = 0;
      if (db) {
        try {
          const result = db
            .prepare('SELECT COUNT(*) as count FROM test_config WHERE key = ?')
            .get('admin_password_hash') as { count: number } | undefined;
          adminCount = result?.count ?? 0;
        } catch (dbErr) {
          console.warn('[STARTUP] DB error counting admin:', dbErr);
        }
      }

      console.log(`[STARTUP] Admin setup status: ${setupComplete ? 'COMPLETE' : 'NOT SETUP'}`);
      console.log(`[STARTUP] Registered admin count: ${adminCount}`);
    } catch (err) {
      console.warn('[STARTUP] Unexpected error:', err);
    }
  }, 1000);

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

app.on('before-quit', () => {
  invalidateAllSessions();
  mainWindow?.webContents.send('admin-session-invalidated');
});
