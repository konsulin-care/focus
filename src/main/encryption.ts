/**
 * F.O.C.U.S. Assessment - Encryption Key Management
 *
 * Database encryption using SQLCipher with secure key management.
 * Keys are stored in userData directory with restricted permissions.
 */

import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { app } from 'electron';
import Database from 'better-sqlite3';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  openSync,
  readSync,
  closeSync,
  unlinkSync,
  renameSync,
} from 'node:fs';

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
  const keyPath = path.join(app.getPath('userData'), '.focus_db_key');

  // Check if key already exists
  if (existsSync(keyPath)) {
    try {
      const existingKey = readFileSync(keyPath, 'utf8').trim();
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
    writeFileSync(keyPath, newKey, { mode: 0o600 });
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
  if (!existsSync(dbPath)) {
    return false; // New database, not yet encrypted
  }

  // Try to open without key and check if it's a valid SQLite database
  try {
    // SQLCipher databases have a different header than standard SQLite
    const headerBuffer = Buffer.alloc(16);

    const fd = openSync(dbPath, 'r');
    readSync(fd, headerBuffer, 0, 16, 0);
    closeSync(fd);

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

    // Helper function to safely quote SQL identifiers (prevents SQL injection)
    function quoteIdentifier(identifier: string): string {
      return `"${identifier.replace(/"/g, '""')}"`;
    }

    // Close current connection
    db.close();

    // Rename current database to backup

    if (existsSync(tempDbPath)) {
      unlinkSync(tempDbPath);
    }

    renameSync(encryptedDbPath, tempDbPath);

    // Open backup and re-export with encryption
    const backupDb = new Database(tempDbPath);
    const encryptedDb = new Database(encryptedDbPath);

    // Apply encryption key to new database
    encryptedDb.exec(`PRAGMA key = "x'${newKey}'"`);
    encryptedDb.exec('PRAGMA cipher_use_hmac = 1');

    // Export all data and re-import
    const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[];

    for (const table of tables) {
      if (table.name === 'sqlite_sequence') continue;

      // Get table schema
      const schema = backupDb
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
        .get(table.name) as { sql: string };

      // Create table in encrypted database
      encryptedDb.exec(schema.sql);

      // Get column info to identify generated/virtual columns
      // PRAGMA table_xinfo returns hidden column: 0=normal, 1=generated, 2=hidden
      const columnInfo = backupDb.prepare(`PRAGMA table_xinfo(${table.name})`).all() as Array<{
        name: string;
        hidden: number;
      }>;
      const writableColumns = columnInfo
        .filter((col) => col.hidden === 0) // Only include non-hidden columns (excludes generated/virtual columns)
        .map((col) => col.name);

      if (writableColumns.length === 0) {
        console.log(`[ENC] Skipping table ${table.name} - no writable columns`);
        continue;
      }

      // Copy data using only writable columns
      const quotedTableName = quoteIdentifier(table.name);
      const quotedColumns = writableColumns.map(quoteIdentifier);

      const data = backupDb
        .prepare(`SELECT ${quotedColumns.join(', ')} FROM ${quotedTableName}`)
        .all() as Record<string, unknown>[];
      if (data.length > 0) {
        const columns = quotedColumns.join(', ');
        const placeholders = writableColumns.map(() => '?').join(', ');
        const insertStmt = encryptedDb.prepare(
          `INSERT INTO ${quotedTableName} (${columns}) VALUES (${placeholders})`
        );

        for (const row of data) {
          const values = writableColumns.map((col) => {
            // Guard against prototype pollution and unexpected properties
            if (Object.prototype.hasOwnProperty.call(row, col)) {
              return row[col];
            }
            return undefined;
          });
          insertStmt.run(...values);
        }
      }
    }

    backupDb.close();
    encryptedDb.close();

    // Remove backup
    unlinkSync(tempDbPath);

    console.log('[ENC] Database migration completed successfully');
  } catch (error) {
    console.error('[ENC] Failed to migrate database:', error);
    throw error;
  }
}
