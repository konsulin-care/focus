/**
 * F.O.C.U.S. Assessment - Trial Constants
 * 
 * Consolidated constants for trial processing and metrics calculation.
 */

export const TRIAL_CONSTANTS = {
  /** Threshold in milliseconds for anticipatory responses */
  ANTICIPATORY_THRESHOLD_MS: 150,
  
  /** Maximum valid anticipatory response percentage */
  MAX_ANTICIPATORY_PERCENT: 20,
  
  /** Full test trial count (21.6 minute test) */
  FULL_TEST_TRIALS: 648,
  
  /** Minimum valid responses for test validity */
  MIN_VALID_RESPONSES: 5,
  
  /** ACS threshold for normal interpretation (proportional scaling applied) */
  ACS_NORMAL_THRESHOLD: 2,
  
  /** ACS threshold for borderline interpretation (proportional scaling applied) */
  ACS_BORDERLINE_THRESHOLD: 1.5,
  
  /** ACS constant for scaled Z-score conversion */
  ACS_CONSTANT: 1.80,
  
  /** Weight for attention score in consistency calculation */
  ATTENTION_SCORE_WEIGHT: 0.6,
  
  /** Weight for impulse control score in consistency calculation */
  IMPULSE_CONTROL_WEIGHT: 0.4,
} as const;
