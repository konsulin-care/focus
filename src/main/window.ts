/**
 * F.O.C.U.S. Assessment - Window Management
 * 
 * Browser window creation and management.
 */

import { BrowserWindow, Menu } from 'electron';
import * as path from 'path';

/**
 * Create and configure the main application window.
 * 
 * @returns The created BrowserWindow instance
 */
export function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
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

  return mainWindow;
}

/**
 * Set the application menu (null = no menu).
 */
export function setApplicationMenu(): void {
  Menu.setApplicationMenu(null);
}
