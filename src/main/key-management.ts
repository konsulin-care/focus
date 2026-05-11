/**
 * F.O.C.U.S. Assessment - Key Management
 *
 * Handles the Local Master Key (LMK) using system keychain (keytar)
 * and manages the unique Device UUID stored in the database.
 */

import { randomBytes, createCipheriv, createDecipheriv, randomUUID } from 'node:crypto';
import keytar from 'keytar';
import type { Database as DatabaseType } from 'better-sqlite3';
import { db } from './database';
import {
  DEFAULT_KEYTAR_SERVICE,
  DEFAULT_KEYTAR_ACCOUNT,
  DB_KEY_KEYTAR_SERVICE,
  DB_KEY_KEYTAR_ACCOUNT,
} from './constants';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended for GCM

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Retrieves the Local Master Key (LMK) from the system keychain.
 * If it doesn't exist, generates a new 32-byte random hex string and stores it.
 *
 * @returns The 32-byte LMK as a hex string.
 */
export async function getOrCreateLMK(): Promise<string> {
  try {
    // Determine keytar service and account from DB config, with defaults
    let service = DEFAULT_KEYTAR_SERVICE;
    let account = DEFAULT_KEYTAR_ACCOUNT;

    if (db) {
      const serviceRow = db
        .prepare('SELECT value FROM test_config WHERE key = ?')
        .get(DB_KEY_KEYTAR_SERVICE) as { value: string } | undefined;
      if (serviceRow?.value) {
        service = serviceRow.value;
      }

      const accountRow = db
        .prepare('SELECT value FROM test_config WHERE key = ?')
        .get(DB_KEY_KEYTAR_ACCOUNT) as { value: string } | undefined;
      if (accountRow?.value) {
        account = accountRow.value;
      }
    }

    const existingKey = await keytar.getPassword(service, account);
    if (existingKey) {
      return existingKey;
    }

    // Generate 32 random bytes for AES-256
    const newKey = randomBytes(32).toString('hex');
    await keytar.setPassword(service, account, newKey);
    return newKey;
  } catch (error) {
    console.error('[KeyManagement] Error accessing system keychain:', error);
    throw new Error('Failed to retrieve or create Local Master Key');
  }
}

/**
 * Encrypts plaintext using the LMK.
 *
 * @param plaintext The string to encrypt.
 * @returns EncryptionResult containing hex encoded ciphertext, IV, and auth tag.
 */
export async function encryptWithLMK(plaintext: string): Promise<EncryptionResult> {
  try {
    const lmkHex = await getOrCreateLMK();
    const key = Buffer.from(lmkHex, 'hex');
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag,
    };
  } catch (error) {
    console.error('[KeyManagement] Encryption failed:', error);
    throw new Error('Encryption process failed');
  }
}

/**
 * Decrypts ciphertext using the LMK.
 *
 * @param ciphertextHex Hex encoded ciphertext.
 * @param ivHex Hex encoded initialization vector.
 * @param tagHex Hex encoded authentication tag.
 * @returns The decrypted plaintext string.
 */
export async function decryptWithLMK(
  ciphertextHex: string,
  ivHex: string,
  tagHex: string
): Promise<string> {
  try {
    const lmkHex = await getOrCreateLMK();
    const key = Buffer.from(lmkHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    console.error('[KeyManagement] Decryption failed:', error);
    throw new Error('Decryption process failed - data may be corrupted or key changed');
  }
}

/**
 * Retrieves the Device UUID from the database.
 * If it doesn't exist, generates a random UUID and stores it.
 *
 * @param db The initialized database instance.
 * @returns The Device UUID string.
 */
export function getOrCreateDeviceUUID(db: DatabaseType): string {
  try {
    const uuid = randomUUID();
    db.prepare(
      `
      INSERT INTO test_config (key, value) VALUES ('device_uuid', ?)
      ON CONFLICT(key) DO NOTHING
    `
    ).run(uuid);

    const row = db.prepare('SELECT value FROM test_config WHERE key = ?').get('device_uuid') as
      | { value: string }
      | undefined;

    if (!row) {
      throw new Error('Failed to retrieve device UUID after insert');
    }

    return row.value;
  } catch (error) {
    console.error('[KeyManagement] Error managing Device UUID:', error);
    throw new Error('Failed to retrieve or create Device UUID');
  }
}
