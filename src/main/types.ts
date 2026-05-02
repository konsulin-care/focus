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
  | 'get-expired-count'
  | 'get-all-sessions'
  | 'get-session-with-user'
  | 'get-session-trials'
  | 'update-session-status'
  | 'bulk-delete-sessions';

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

// ===========================================
// Database Record Types
// ===========================================

export interface User {
  id: number;
  email: string;
  age: number;
  gender: 'Male' | 'Female';
  is_generic: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestSession {
  id: number;
  user_id: number;
  test_date: string;
  acs_score: number;
  acs_interpretation: string;
  mean_response_time_ms: number;
  response_time_variability: number;
  commission_errors: number;
  omission_errors: number;
  hits: number;
  d_prime: number;
  validity: string;
  validity_reason?: string;
  total_trials: number;
  test_config: string;
  upload_status: string;
  uploaded_at?: string | null;
  consent_given: boolean;
  consent_timestamp?: string | null;
}

export interface SessionWithUser extends TestSession {
  email: string;
  age: number;
  gender: 'Male' | 'Female';
  is_generic: number; // 0 or 1 from DB
}

export interface TrialData {
  id: number;
  test_session_id: number;
  trial_index: number;
  stimulus_type: 'target' | 'non-target';
  outcome: 'hit' | 'omission' | 'commission' | 'correct-rejection' | null;
  response_correct: boolean | null;
  response_time_ms: number | null;
  is_anticipatory: boolean;
  is_multiple_response: boolean;
  follows_commission: boolean;
}
