/**
 * F.O.C.U.S. Assessment - GDPR Compliance Module
 * 
 * Data retention and cleanup functions for GDPR compliance.
 * Implements the storage limitation principle by automatically
 * deleting records after 7 days.
 */

import { db } from './database';

/**
 * Clean up expired test records (older than retention period).
 * 
 * @returns Number of records deleted
 */
export function cleanupExpiredRecords(): number {
  if (!db) {
    console.warn('Database not initialized, skipping cleanup');
    return 0;
  }

  try {
    // Delete records where retention_expires_at is in the past
    const result = db.prepare(`
      DELETE FROM test_results
      WHERE retention_expires_at < datetime('now')
    `).run();

    const deletedCount = result.changes;
    console.log(`GDPR cleanup: Deleted ${deletedCount} expired records`);
    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup expired records:', error);
    return 0;
  }
}

/**
 * Get count of expired records (for monitoring).
 * 
 * @returns Number of expired records
 */
export function getExpiredRecordCount(): number {
  if (!db) return 0;

  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM test_results
      WHERE retention_expires_at < datetime('now')
    `).get() as { count: number };
    return result.count;
  } catch (error) {
    console.error('Failed to get expired count:', error);
    return 0;
  }
}

/**
 * Validate email format for GDPR data collection.
 * 
 * @param email - Email address to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}
