/**
 * F.O.C.U.S. Assessment - Global Configuration
 */

export const CONFIG = {
  RECOVERY_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || 'https://webhook.example.com/recovery',
  RECOVERY_WEBHOOK_SECRET: process.env.RECOVERY_WEBHOOK_SECRET || 'default-secret-change-me',
};
