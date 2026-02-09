/**
 * F.O.C.U.S. Assessment - ACS Calculation Details
 * 
 * Utility for generating detailed ACS calculation breakdown for modal display.
 * Uses computeAcsValues from acs-shared.ts for core calculations.
 */

import { TestEvent } from '../types/electronAPI';
import { SubjectInfo, AcsCalculationDetails } from '../types/trial';
import { inverseNormalCDF } from './distributions';
import { computeAcsValues, AcsIntermediateResult } from './acs-shared';
import { TRIAL_CONSTANTS } from './trial-constants';
import { clampProbability } from './distributions';

/**
 * Calculate z-score magnitude (absolute value of z-score).
 * Uses inverse normal CDF from distributions module.
 * 
 * @param p - Probability between 0 and 1
 * @returns Z-score magnitude (always positive)
 */
function getZScoreMagnitude(p: number): number {
  return Math.abs(inverseNormalCDF(p));
}

/**
 * Calculate adjusted rates for display (per TOVA methodology).
 * 
 * @param hitRate - Raw hit rate
 * @param falseAlarmRate - Raw false alarm rate
 * @returns Object with adjusted rates
 */
function calculateAdjustedRates(hitRate: number, falseAlarmRate: number) {
  return {
    adjustedHitRate: clampProbability(hitRate),
    adjustedFARate: clampProbability(falseAlarmRate),
  };
}

/**
 * Calculate z-scores for display based on raw rates.
 * Per TOVA manual: zFA is positive for low FA rates, zHit is negative for high hit rates
 * 
 * @param hitRate - Raw hit rate
 * @param falseAlarmRate - Raw false alarm rate
 * @returns Object with z-scores
 */
function calculateZScoresForDisplay(hitRate: number, falseAlarmRate: number) {
  const zHit = hitRate > 0.5 ? -getZScoreMagnitude(hitRate) : getZScoreMagnitude(hitRate);
  const zFA = falseAlarmRate > 0.5 ? -getZScoreMagnitude(falseAlarmRate) : getZScoreMagnitude(falseAlarmRate);
  return { zHit, zFA };
}

/**
 * Calculate D' intermediate values for the modal display.
 * Uses second half trials per ACS methodology.
 * 
 * @param result - Intermediate result from computeAcsValues
 * @returns Object with hit rate, false alarm rate, and z-scores for display
 */
function calculateDPrimeIntermediates(result: AcsIntermediateResult) {
  const secondHalfHits = result.secondHalfTrials.filter(t => t.outcome === 'hit').length;
  const secondHalfOmissions = result.secondHalfTrials.filter(t => t.outcome === 'omission').length;
  const secondHalfCommissions = result.secondHalfTrials.filter(t => t.outcome === 'commission').length;
  const secondHalfCorrectRejections = result.secondHalfTrials.filter(t => t.outcome === 'correct-rejection').length;
  
  const secondHalfTargets = secondHalfHits + secondHalfOmissions;
  const secondHalfNonTargets = secondHalfCommissions + secondHalfCorrectRejections;
  
  const hitRate = secondHalfTargets > 0 ? secondHalfHits / secondHalfTargets : 0.5;
  const falseAlarmRate = secondHalfNonTargets > 0 ? secondHalfCommissions / secondHalfNonTargets : 0.5;
  
  // Calculate adjusted rates first (uses clampProbability internally)
  const { adjustedHitRate, adjustedFARate } = calculateAdjustedRates(hitRate, falseAlarmRate);
  
  return {
    hitRate,
    falseAlarmRate,
    adjustedHitRate,
    adjustedFARate,
    ...calculateZScoresForDisplay(adjustedHitRate, adjustedFARate),
    dPrime: result.dPrime,
  };
}

/**
 * Generate detailed ACS calculation breakdown for modal display.
 * 
 * @param events - Array of raw test events from the test session
 * @param subjectInfo - Subject demographic information (age, gender)
 * @returns Complete calculation breakdown for display
 */
export function generateAcsCalculationDetails(
  events: TestEvent[],
  subjectInfo: SubjectInfo
): AcsCalculationDetails {
  // Use shared helper for all core calculations
  const result = computeAcsValues(events, subjectInfo);
  
  // Check if normative data is available
  const normativeAvailable = result.normativeStats !== null;
  
  // Calculate D' intermediate values for display
  const dPrimeIntermediates = calculateDPrimeIntermediates(result);
  
  // Get valid hit response times for variability display
  const validHitResponseTimes = result.trials
    .filter(t => t.outcome === 'hit' && t.responseTimeMs !== null && !t.isAnticipatory)
    .map(t => t.responseTimeMs as number);
  
  // Helper to get norm values or null when not available
  const getNormMean = (): number | null => 
    normativeAvailable && result.normativeStats ? result.normativeStats.responseTimeMean : null;
  const getNormSD = (): number | null => 
    normativeAvailable && result.normativeStats ? result.normativeStats.responseTimeSD : null;
  
  // Build and return detailed breakdown
  return {
    age: subjectInfo.age,
    gender: subjectInfo.gender,
    normativeGroup: result.normativeStats?.ageRange || 'Unknown',
    normativeAvailable,
    
    dPrime: {
      hitRate: dPrimeIntermediates.hitRate,
      falseAlarmRate: dPrimeIntermediates.falseAlarmRate,
      adjustedHitRate: dPrimeIntermediates.adjustedHitRate,
      adjustedFARate: dPrimeIntermediates.adjustedFARate,
      zHit: dPrimeIntermediates.zHit,
      zFA: dPrimeIntermediates.zFA,
      result: dPrimeIntermediates.dPrime,
    },
    
    variability: {
      mean: result.firstHalfMeanRT,
      sd: result.variability,
      responseTimes: validHitResponseTimes,
    },
    
    zScores: {
      responseTime: {
        subjectValue: result.firstHalfMeanRT,
        normMean: getNormMean(),
        normSD: getNormSD(),
        result: result.rtZ,
      },
      dPrime: {
        subjectValue: result.dPrime,
        normMean: normativeAvailable && result.normativeStats ? result.normativeStats.dPrimeMean : null,
        normSD: normativeAvailable && result.normativeStats ? result.normativeStats.dPrimeSD : null,
        result: result.dPrimeZ,
      },
      variability: {
        subjectValue: result.variability,
        normMean: normativeAvailable && result.normativeStats ? result.normativeStats.variabilityMean : null,
        normSD: normativeAvailable && result.normativeStats ? result.normativeStats.variabilitySD : null,
        result: result.variabilityZ,
      },
    },
    
    acs: normativeAvailable
      ? {
          rtZ: result.rtZ,
          dPrimeZ: result.dPrimeZ,
          variabilityZ: result.variabilityZ,
          constant: TRIAL_CONSTANTS.ACS_CONSTANT,
          result: result.acs,
        }
      : null,
  };
}
