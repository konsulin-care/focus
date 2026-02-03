/**
 * F.O.C.U.S. Assessment - Trial Result Types
 * 
 * Types for post-processed trial data and computed metrics.
 */

import { StimulusType } from './electronAPI';

/**
 * Possible outcomes for a single trial.
 */
export type TrialOutcome = 'hit' | 'omission' | 'commission' | 'correct-rejection';

/**
 * Result of a single trial after post-processing.
 */
export interface TrialResult {
  /** Index of the trial (0-based) */
  trialIndex: number;
  
  /** Type of stimulus presented */
  stimulusType: StimulusType;
  
  /** Primary behavioral outcome */
  outcome: TrialOutcome;
  
  /** Response time in milliseconds, null if no response */
  responseTimeMs: number | null;
  
  /** True if response was within 150ms of stimulus onset */
  isAnticipatory: boolean;
  
  /** True if more than one response was recorded in this trial */
  isMultipleResponse: boolean;
  
  /** True if this trial immediately follows a commission error */
  followsCommission: boolean;
  
  /** Response time for post-commission trials, if applicable */
  postCommissionResponseTimeMs?: number;
}

/**
 * Comprehensive metrics for a completed test session.
 */
export interface TestMetrics {
  /** Array of individual trial results */
  trials: TrialResult[];
  
  // Summary counts
  /** Total number of trials */
  totalTrials: number;
  /** Number of correct target detections */
  hits: number;
  /** Number of missed target stimuli */
  omissions: number;
  /** Number of incorrect responses to non-targets */
  commissions: number;
  /** Number of correct non-responses to non-targets */
  correctRejections: number;
  
  // Response time statistics (in milliseconds)
  /** Mean response time across all valid responses */
  meanResponseTimeMs: number;
  /** Standard deviation of response times */
  stdResponseTimeMs: number;
  
  // Validity indices
  /** Number of anticipatory responses (<150ms) */
  anticipatoryResponses: number;
  /** Number of trials with multiple responses */
  multipleResponses: number;
  /** Number of trials following a commission error */
  postCommissionTrials: number;
  
  // F.O.C.U.S. composite scores (0-100 scale)
  /** Attention/consistency score based on response time variability */
  attentionScore: number;
  /** Impulse control score based on commission errors */
  impulseControlScore: number;
  /** Overall consistency score */
  consistencyScore: number;
}

/**
 * Subject demographic information for ACS calculation.
 */
export interface SubjectInfo {
  /** Subject age in years */
  age: number;
  /** Subject gender */
  gender: 'Male' | 'Female';
}

/**
 * Validity assessment for test results.
 */
export interface ValidityAssessment {
  /** Number of anticipatory responses */
  anticipatoryResponses: number;
  /** Whether the test is considered valid */
  valid: boolean;
  /** Reason for invalidity if not valid */
  exclusionReason?: string;
}

/**
 * Z-scores for individual attention components.
 */
export interface AttentionZScores {
  /** Z-score for response time (first half of test) */
  responseTime: number;
  /** Z-score for D Prime (second half of test) */
  dPrime: number;
  /** Z-score for response time variability (total test) */
  variability: number;
}

/**
 * Comprehensive attention metrics including ACS scoring.
 */
export interface AttentionMetrics {
  /** Attention Comparison Score */
  acs: number;
  /** Interpretation of ACS score */
  acsInterpretation: 'normal' | 'borderline' | 'not-within-normal-limits';
  /** Omission error percentage */
  omissionPercent: number;
  /** Commission error percentage */
  commissionPercent: number;
  /** D Prime (signal detection sensitivity) */
  dPrime: number;
  /** Response time variability (variance of response times) */
  variability: number;
  /** Mean response time in milliseconds */
  meanResponseTimeMs: number;
  /** Validity assessment */
  validity: ValidityAssessment;
  /** Number of trials in test */
  trialCount: number;
  /** Scaling factor applied to Z-scores (proportional to trial count) */
  scalingFactor: number;
  /** Z-scores for individual components */
  zScores: AttentionZScores;
}
