/**
 * F.O.C.U.S. Assessment - Encryption Key Management
 * 
 * Database encryption using SQLCipher with secure key management.
 * Keys are stored in userData directory with restricted permissions.
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';
import Database from 'better-sqlite3';

// ===========================================
// Key Generation
// ===========================================

/**
 * Generate a random 256-bit (32 byte) encryption key as hex string.
 * This key is used to encrypt the SQLite database with SQLCipher.
 * 
 * @returns The encryption key as 64-character hex string
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32);
  return key.toString('hex');
}

// ===========================================
// Key Storage
// ===========================================

/**
 * Get or create encryption key for database encryption.
 * Key is stored in userData directory with restricted permissions (chmod 600).
 * 
 * @returns The encryption key as hex string
 */
export function getOrCreateEncryptionKey(): string {
  const fs = require('fs');
  const keyPath = path.join(app.getPath('userData'), '.focus_db_key');
  
  // Check if key already exists
  if (fs.existsSync(keyPath)) {
    try {
      const existingKey = fs.readFileSync(keyPath, 'utf8').trim();
      // Validate key format (64 hex characters = 256 bits)
      if (existingKey.length === 64 && /^[a-fA-F0-9]+$/.test(existingKey)) {
        console.log('[ENC] Using existing encryption key');
        return existingKey;
      } else {
        console.warn('[ENC] Invalid encryption key format, generating new key');
      }
    } catch (error) {
      console.error('[ENC] Failed to read existing encryption key:', error);
    }
  }
  
  // Generate new key
  const newKey = generateEncryptionKey();
  
  try {
    fs.writeFileSync(keyPath, newKey, { mode: 0o600 });
    console.log('[ENC] New encryption key generated and stored');
  } catch (error) {
    console.error('[ENC] Failed to store encryption key:', error);
  }
  
  return newKey;
}

// ===========================================
// Database Encryption Detection
// ===========================================

/**
 * Check if the database is already encrypted by attempting to read it.
 * An encrypted database will return an error when accessed without the key.
 * 
 * @param dbPath - Path to the database file
 * @returns true if the database appears to be encrypted
 */
export function isDatabaseEncrypted(dbPath: string): boolean {
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

// ===========================================
// Database Migration
// ===========================================

/**
 * Migrate an unencrypted database to encrypted format.
 * Uses the export/re-import pattern to re-encrypt the database.
 * 
 * @param db - The database connection (will be closed)
 * @param newKey - The new encryption key
 */
export function migrateToEncrypted(db: Database.Database, newKey: string): void {
  console.log('[ENC] Migrating database to encrypted format...');
  
  try {
    // Create a temporary encrypted database by exporting and re-importing
    const tempDbPath = path.join(app.getPath('userData'), 'focus_backup.db');
    const encryptedDbPath = path.join(app.getPath('userData'), 'focus.db');
    
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
    
    console.log('[ENC] Database migration completed successfully');
  } catch (error) {
    console.error('[ENC] Failed to migrate database:', error);
    throw error;
  }
}
