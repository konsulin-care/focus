/**
 * F.O.C.U.S. Assessment - Key Management
 *
 * Handles the Local Master Key (LMK) using system keychain (keytar)
 * and manages the unique Device UUID stored in the database.
 */

import { randomBytes, createCipheriv, createDecipheriv, randomUUID } from 'node:crypto';
import keytar from 'keytar';
import Database from 'better-sqlite3';

const KEYTAR_SERVICE = 'focus-auth';
const KEYTAR_ACCOUNT = 'local-master-key';
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
    const existingKey = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    if (existingKey) {
      return existingKey;
    }

    // Generate 32 random bytes for AES-256
    const newKey = randomBytes(32).toString('hex');
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, newKey);
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
export function getOrCreateDeviceUUID(db: Database.Database): string {
  try {
    const row = db.prepare('SELECT value FROM test_config WHERE key = ?').get('device_uuid') as
      | { value: string }
      | undefined;

    if (row) {
      return row.value;
    }

    const uuid = randomUUID();
    db.prepare('INSERT INTO test_config (key, value) VALUES (?, ?)').run('device_uuid', uuid);

    return uuid;
  } catch (error) {
    console.error('[KeyManagement] Error managing Device UUID:', error);
    throw new Error('Failed to retrieve or create Device UUID');
  }
}
