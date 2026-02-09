/**
 * F.O.C.U.S. Assessment - ACS Calculation Details
 * 
 * Utility for generating detailed ACS calculation breakdown for modal display.
 */

import { TestEvent, TestConfig } from '../types/electronAPI';
import { SubjectInfo, AcsCalculationDetails } from '../types/trial';
import { getNormativeStats } from './normative-data';
import { calculateDPrime, inverseNormalCDF } from './distributions';
import { calculateStdDev } from './basic-stats';
import { processTestEvents } from './trial-processing';
import { TRIAL_CONSTANTS } from './trial-constants';

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
  // Process events into trial results
  const trials = processTestEvents(events, {
    totalTrials: events.filter(e => e.eventType === 'stimulus-onset').length
  } as TestConfig);
  
  // Get normative statistics for the subject's age/gender
  const normativeStats = getNormativeStats(subjectInfo.age, subjectInfo.gender);
  
  // Split trials for half-based calculations (per ACS methodology)
  const midpoint = Math.floor(trials.length / 2);
  const firstHalfTrials = trials.slice(0, midpoint);
  const secondHalfTrials = trials.slice(midpoint);
  
  // === D' Calculation (Second Half) ===
  const secondHalfHits = secondHalfTrials.filter(t => t.outcome === 'hit').length;
  const secondHalfOmissions = secondHalfTrials.filter(t => t.outcome === 'omission').length;
  const secondHalfCommissions = secondHalfTrials.filter(t => t.outcome === 'commission').length;
  const secondHalfCorrectRejections = secondHalfTrials.filter(t => t.outcome === 'correct-rejection').length;
  
  const secondHalfTargets = secondHalfHits + secondHalfOmissions;
  const secondHalfNonTargets = secondHalfCommissions + secondHalfCorrectRejections;
  
  // Raw rates
  const hitRate = secondHalfTargets > 0 ? secondHalfHits / secondHalfTargets : 0.5;
  const falseAlarmRate = secondHalfNonTargets > 0 ? secondHalfCommissions / secondHalfNonTargets : 0.5;
  
  // Adjusted rates per TOVA methodology (handled by calculateDPrime)
  const adjustedHitRate = hitRate <= 0 ? 0.00001 : hitRate >= 1 ? 0.99999 : hitRate;
  const adjustedFARate = falseAlarmRate <= 0 ? 0.00001 : falseAlarmRate >= 1 ? 0.99999 : falseAlarmRate;
  
  // Calculate D' using the shared function
  const dPrime = calculateDPrime(hitRate, falseAlarmRate);
  
  // Calculate z-scores for display
  // Per TOVA manual: zFA is positive for low FA rates, zHit is negative for high hit rates
  const zHit = hitRate > 0.5 ? -getZScoreMagnitude(hitRate) : getZScoreMagnitude(hitRate);
  const zFA = falseAlarmRate > 0.5 ? -getZScoreMagnitude(falseAlarmRate) : getZScoreMagnitude(falseAlarmRate);
  
  // === Variability Calculation (All Valid Hits) ===
  const validHitResponseTimes = trials
    .filter(t => t.outcome === 'hit' && t.responseTimeMs !== null && !t.isAnticipatory)
    .map(t => t.responseTimeMs as number);
  
  const variability = validHitResponseTimes.length > 0
    ? calculateStdDev(validHitResponseTimes)
    : 0;
  
  // === Response Time Calculation (First Half) ===
  const firstHalfValidHits = firstHalfTrials.filter(t => t.outcome === 'hit' && !t.isAnticipatory);
  const firstHalfResponseTimes = firstHalfValidHits.map(t => t.responseTimeMs as number);
  const meanResponseTimeMs = firstHalfResponseTimes.length > 0
    ? firstHalfResponseTimes.reduce((a, b) => a + b, 0) / firstHalfResponseTimes.length
    : 0;
  
  // === Z-Score Calculations ===
  const rtZ = normativeStats
    ? (meanResponseTimeMs - normativeStats.responseTimeMean) / normativeStats.responseTimeSD
    : 0;
  
  const dPrimeZ = normativeStats
    ? (dPrime - normativeStats.dPrimeMean) / normativeStats.dPrimeSD
    : 0;
  
  const variabilityZ = normativeStats
    ? (variability - normativeStats.variabilityMean) / normativeStats.variabilitySD
    : 0;
  
  // === Final ACS Calculation ===
  const acs = rtZ + dPrimeZ + variabilityZ + TRIAL_CONSTANTS.ACS_CONSTANT;
  
  // === Build and Return Result ===
  return {
    age: subjectInfo.age,
    gender: subjectInfo.gender,
    normativeGroup: normativeStats?.ageRange || 'Unknown',
    
    dPrime: {
      hitRate,
      falseAlarmRate,
      adjustedHitRate,
      adjustedFARate,
      zHit,
      zFA,
      result: dPrime,
    },
    
    variability: {
      mean: meanResponseTimeMs,
      sd: variability,
      responseTimes: validHitResponseTimes,
    },
    
    zScores: {
      responseTime: {
        subjectValue: meanResponseTimeMs,
        normMean: normativeStats?.responseTimeMean || 0,
        normSD: normativeStats?.responseTimeSD || 1,
        result: rtZ,
      },
      dPrime: {
        subjectValue: dPrime,
        normMean: normativeStats?.dPrimeMean || 0,
        normSD: normativeStats?.dPrimeSD || 1,
        result: dPrimeZ,
      },
      variability: {
        subjectValue: variability,
        normMean: normativeStats?.variabilityMean || 0,
        normSD: normativeStats?.variabilitySD || 1,
        result: variabilityZ,
      },
    },
    
    acs: {
      rtZ,
      dPrimeZ,
      variabilityZ,
      constant: TRIAL_CONSTANTS.ACS_CONSTANT,
      result: acs,
    },
  };
}
