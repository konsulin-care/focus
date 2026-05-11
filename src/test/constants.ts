/**
 * F.O.C.U.S. Test Constants
 *
 * Shared constants for test files to avoid magic strings.
 */

/** Database configuration keys in test_config table */
export const DB_KEYS = {
  ADMIN_SETUP_COMPLETE: 'admin_setup_complete',
  ADMIN_PASSWORD_HASH: 'admin_password_hash',
  FAILED_LOGIN_ATTEMPTS: 'failed_login_attempts',
  LOCKOUT_UNTIL: 'lockout_until',
  SESSION_EXPIRY: 'session_expiry',
  RECOVERY_CIPHERTEXT: 'recovery_ciphertext',
  RECOVERY_IV: 'recovery_iv',
  RECOVERY_TAG: 'recovery_tag',
  ADMIN_EMAIL_CIPHERTEXT: 'admin_email_ciphertext',
  ADMIN_EMAIL_IV: 'admin_email_iv',
  ADMIN_EMAIL_TAG: 'admin_email_tag',
  ADMIN_DEVICE_UUID: 'admin_device_uuid',
  DEVICE_UUID: 'device_uuid',
} as const;

/** Common string literal values used in tests */
export const STR_VALUES = {
  ZERO: '0',
  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
} as const;
