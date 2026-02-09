/**
 * F.O.C.U.S. Assessment - Attention Metrics
 * 
 * Utility functions for calculating comprehensive attention metrics with ACS scoring.
 */

import { TestEvent } from '../types/electronAPI';
import { SubjectInfo, AttentionMetrics } from '../types/trial';
import { computeAcsValues } from './acs-shared';
import { TRIAL_CONSTANTS } from './trial-constants';

/**
 * Calculate comprehensive attention metrics with ACS scoring.
 * Uses computeAcsValues() for shared ACS calculation logic.
 * 
 * @param events - Array of raw test events
 * @param subjectInfo - Subject demographic information
 * @returns Comprehensive attention metrics
 */
export function calculateAttentionMetrics(
  events: TestEvent[],
  subjectInfo: SubjectInfo
): AttentionMetrics {
  // Use shared helper for ACS calculations
  const {
    trials,
    firstHalfMeanRT,
    dPrime,
    variability,
    rtZ,
    dPrimeZ,
    variabilityZ,
    acs,
  } = computeAcsValues(events, subjectInfo);
  
  // Count outcomes from processed trials
  const hits = trials.filter(t => t.outcome === 'hit').length;
  const omissions = trials.filter(t => t.outcome === 'omission').length;
  const commissions = trials.filter(t => t.outcome === 'commission').length;
  const correctRejections = trials.filter(t => t.outcome === 'correct-rejection').length;
  const anticipatoryResponses = trials.filter(t => t.isAnticipatory).length;
  const multipleResponses = trials.filter(t => t.isMultipleResponse).length;
  
  // Calculate totals
  const totalTargets = hits + omissions;
  const totalNonTargets = commissions + correctRejections;
  
  // Calculate percentages
  const omissionPercent = totalTargets > 0 ? (omissions / totalTargets) * 100 : 0;
  const commissionPercent = totalNonTargets > 0 ? (commissions / totalNonTargets) * 100 : 0;
  
  // Validity assessment
  const anticipatoryPercent = totalTargets > 0 ? (anticipatoryResponses / totalTargets) * 100 : 0;
  const validResponses = trials.filter(t => t.outcome === 'hit' && !t.isAnticipatory).length;
  const minValidResponses = TRIAL_CONSTANTS.MIN_VALID_RESPONSES;
  
  let validity: AttentionMetrics['validity'];
  
  if (anticipatoryPercent > TRIAL_CONSTANTS.MAX_ANTICIPATORY_PERCENT) {
    validity = {
      anticipatoryResponses,
      valid: false,
      exclusionReason: `High anticipatory response rate (${anticipatoryPercent.toFixed(1)}% of targets)`,
    };
  } else if (validResponses < minValidResponses) {
    validity = {
      anticipatoryResponses,
      valid: false,
      exclusionReason: `Insufficient valid response data (${validResponses}/${minValidResponses} minimum)`,
    };
  } else {
    validity = {
      anticipatoryResponses,
      valid: true,
    };
  }
  
  // Interpret ACS (handle null case when no normative data)
  let acsInterpretation: 'normal' | 'borderline' | 'not-within-normal-limits' | 'unavailable';
  if (acs === null) {
    acsInterpretation = 'unavailable';
  } else if (acs >= TRIAL_CONSTANTS.ACS_NORMAL_THRESHOLD) {
    acsInterpretation = 'normal';
  } else if (acs >= TRIAL_CONSTANTS.ACS_BORDERLINE_THRESHOLD) {
    acsInterpretation = 'borderline';
  } else {
    acsInterpretation = 'not-within-normal-limits';
  }
  
  return {
    // Raw response counts
    hits,
    commissions,
    omissions,
    correctRejections,
    anticipatoryResponses,
    multipleResponses,
    
    // ACS scoring
    acs,
    acsInterpretation,
    
    // Percentages
    omissionPercent,
    commissionPercent,
    
    // Other metrics
    dPrime,
    variability,
    meanResponseTimeMs: firstHalfMeanRT,
    validity,
    trialCount: trials.length,
    scalingFactor: 1,
    zScores: {
      responseTime: rtZ,
      dPrime: dPrimeZ,
      variability: variabilityZ,
    },
  };
}
