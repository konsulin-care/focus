/**
 * This file is auto-generated during the CI build process.
 * Do not edit manually - values are injected from GitHub Secrets.
 */

export const CONFIG = {
  RECOVERY_WEBHOOK_URL: '', // Injected during build
  RECOVERY_WEBHOOK_SECRET: '', // Injected during build
};

// Runtime validation for production builds
if (process.env.NODE_ENV === 'production') {
  if (!CONFIG.RECOVERY_WEBHOOK_URL || !CONFIG.RECOVERY_WEBHOOK_SECRET) {
    throw new Error(
      'Missing required webhook configuration. ' +
        'RECOVERY_WEBHOOK_URL and RECOVERY_WEBHOOK_SECRET must be set during build.'
    );
  }
}
