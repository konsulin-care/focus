/**
 * F.O.C.U.S. Assessment - Type Definitions
 * 
 * Centralized type definitions for the Electron main process.
 * All type definitions should be imported from this module.
 */

// ===========================================
// Test Configuration Types
// ===========================================

/**
 * Configuration for the F.O.C.U.S. test protocol.
 */
export interface TestConfig {
  /** Duration of each stimulus presentation in milliseconds */
  stimulusDurationMs: number;
  /** Interval between stimulus offset and next stimulus onset in milliseconds */
  interstimulusIntervalMs: number;
  /** Total number of trials in the test */
  totalTrials: number;
  /** Buffer period before first stimulus in milliseconds */
  bufferMs: number;
}

/**
 * Default test configuration values.
 */
export const DEFAULT_TEST_CONFIG: TestConfig = {
  stimulusDurationMs: 100,
  interstimulusIntervalMs: 2000,
  totalTrials: 648,
  bufferMs: 500,
};

// ===========================================
// Stimulus Types
// ===========================================

/**
 * Types of stimuli presented during the test.
 */
export type StimulusType = 'target' | 'non-target';

// ===========================================
// Consent and GDPR Types
// ===========================================

/**
 * Consent data collected before saving test results.
 */
export interface ConsentData {
  /** Whether consent was given */
  consentGiven: boolean;
  /** ISO timestamp of when consent was recorded */
  consentTimestamp: string;
}

// ===========================================
// Test Event Types
// ===========================================

/**
 * Types of events recorded during test execution.
 */
export type TestEventType = 'stimulus-onset' | 'stimulus-offset' | 'response' | 'buffer-start';

/**
 * Event recorded during test execution.
 */
export interface TestEvent {
  /** Index of the trial (0-based), -1 for pre-test events */
  trialIndex: number;
  /** Type of stimulus for this event */
  stimulusType: StimulusType;
  /** Nanosecond timestamp from process.hrtime.bigint() */
  timestampNs: string;
  /** Type of event */
  eventType: TestEventType;
  /** Whether the response was correct (only for response events) */
  responseCorrect?: boolean;
  /** Time from stimulus onset to response in milliseconds (for response events) */
  responseTimeMs?: number;
  /** Number of responses this trial (for response events) */
  responseCount?: number;
  /** True if response within 150ms of onset (for response events) */
  isAnticipatory?: boolean;
}

/**
 * Pending response tracking for the current stimulus window.
 */
export interface PendingResponse {
  /** Trial index for this pending response */
  trialIndex: number;
  /** Type of stimulus */
  stimulusType: StimulusType;
  /** Nanosecond timestamp when stimulus was presented */
  onsetTimestampNs: bigint;
  /** Expected response: true for target (should respond), false for non-target (should not respond) */
  expectedResponse: boolean;
}

// ===========================================
// Database Types
// ===========================================

/**
 * Whitelist of allowed database query commands.
 * Prevents SQL injection by only allowing predefined queries.
 */
export type DatabaseQueryCommand =
  | 'get-pending-uploads'
  | 'get-test-result'
  | 'delete-test-result'
  | 'get-upload-count'
  | 'get-all-test-results'
  | 'insert-test-result'
  | 'insert-test-result-with-consent'
  | 'update-test-result'
  | 'cleanup-expired-records'
  | 'get-expired-count';

/**
 * Type of query for determining the appropriate execution method.
 */
export type QueryType = 'select-one' | 'select-many' | 'write';

/**
 * Entry in the database query whitelist.
 */
export interface QueryWhitelistEntry {
  /** SQL query template */
  sql: string;
  /** Expected number of parameters */
  paramCount: number;
  /** Type of query for execution */
  type: QueryType;
}

// ===========================================
// GDPR Compliance Types
// ===========================================

/**
 * Retention period in days for GDPR storage limitation principle.
 */
export const RETENTION_DAYS = 7;
