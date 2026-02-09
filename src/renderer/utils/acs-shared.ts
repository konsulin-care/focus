/**
 * F.O.C.U.S. Assessment - Shared ACS Calculation Logic
 * 
 * Single source of truth for ACS calculations used by both:
 * - calculateAttentionMetrics (results display)
 * - generateAcsCalculationDetails (modal display)
 */

import { TestEvent, TestConfig } from '../types/electronAPI';
import { SubjectInfo, TrialResult } from '../types/trial';
import { getNormativeStats, NormativeStats } from './normative-data';
import { calculateDPrime } from './clinical-metrics';
import { processTestEvents } from './trial-processing';
import { calculateMean, calculateStdDevWithMean } from './basic-stats';
import { TRIAL_CONSTANTS } from './trial-constants';

/**
 * Intermediate calculation results shared between both consumers.
 */
export interface AcsIntermediateResult {
  // Processed trials
  trials: TrialResult[];
  firstHalfTrials: TrialResult[];
  secondHalfTrials: TrialResult[];
  
  // Raw metrics
  firstHalfMeanRT: number;
  dPrime: number;
  variability: number;
  
  // Normative data
  normativeStats: NormativeStats | null;
  
  // Z-scores
  rtZ: number;
  dPrimeZ: number;
  variabilityZ: number;
  
  // Final ACS
  acs: number;
}

/**
 * Process test events and compute all intermediate ACS values.
 * This is the single source of truth for ACS calculations.
 * 
 * @param events - Raw test events from the test session
 * @param subjectInfo - Subject demographic information
 * @returns All intermediate values needed for both consumers
 */
export function computeAcsValues(
  events: TestEvent[],
  subjectInfo: SubjectInfo
): AcsIntermediateResult {
  // Process events into trial results
  const trials = processTestEvents(events, {
    totalTrials: events.filter(e => e.eventType === 'stimulus-onset').length
  } as TestConfig);
  
  // Get normative statistics
  const normativeStats = getNormativeStats(subjectInfo.age, subjectInfo.gender);
  
  // Split trials for half-based calculations (per ACS methodology)
  const midpoint = Math.floor(trials.length / 2);
  const firstHalfTrials = trials.slice(0, midpoint);
  const secondHalfTrials = trials.slice(midpoint);
  
  // === First Half: Response Time Calculation ===
  const firstHalfValidHits = firstHalfTrials.filter(
    t => t.outcome === 'hit' && t.responseTimeMs !== null && !t.isAnticipatory
  );
  const firstHalfResponseTimes = firstHalfValidHits.map(t => t.responseTimeMs as number);
  const firstHalfMeanRT = firstHalfResponseTimes.length > 0
    ? calculateMean(firstHalfResponseTimes)
    : 0;
  
  // === Second Half: D' Calculation ===
  const secondHalfHits = secondHalfTrials.filter(t => t.outcome === 'hit').length;
  const secondHalfOmissions = secondHalfTrials.filter(t => t.outcome === 'omission').length;
  const secondHalfCommissions = secondHalfTrials.filter(t => t.outcome === 'commission').length;
  const secondHalfCorrectRejections = secondHalfTrials.filter(t => t.outcome === 'correct-rejection').length;
  
  const secondHalfTargets = secondHalfHits + secondHalfOmissions;
  const secondHalfNonTargets = secondHalfCommissions + secondHalfCorrectRejections;
  
  const hitRate = secondHalfTargets > 0 ? secondHalfHits / secondHalfTargets : 0.5;
  const falseAlarmRate = secondHalfNonTargets > 0 ? secondHalfCommissions / secondHalfNonTargets : 0.5;
  const dPrime = calculateDPrime(hitRate, falseAlarmRate);
  
  // === Total: Variability Calculation ===
  const validHitResponseTimes = trials
    .filter(t => t.outcome === 'hit' && t.responseTimeMs !== null && !t.isAnticipatory)
    .map(t => t.responseTimeMs as number);
  
  const overallMeanRT = validHitResponseTimes.length > 0
    ? calculateMean(validHitResponseTimes)
    : firstHalfMeanRT;
  
  const variability = validHitResponseTimes.length > 0
    ? calculateStdDevWithMean(validHitResponseTimes, overallMeanRT)
    : 0;
  
  // === Z-Score Calculations ===
  let rtZ = 0, dPrimeZ = 0, variabilityZ = 0;
  
  if (normativeStats) {
    rtZ = (firstHalfMeanRT - normativeStats.responseTimeMean) / normativeStats.responseTimeSD;
    dPrimeZ = (dPrime - normativeStats.dPrimeMean) / normativeStats.dPrimeSD;
    variabilityZ = (variability - normativeStats.variabilityMean) / normativeStats.variabilitySD;
  }
  
  // === Final ACS Calculation ===
  const acs = rtZ + dPrimeZ + variabilityZ + TRIAL_CONSTANTS.ACS_CONSTANT;
  
  return {
    trials,
    firstHalfTrials,
    secondHalfTrials,
    firstHalfMeanRT,
    dPrime,
    variability,
    normativeStats,
    rtZ,
    dPrimeZ,
    variabilityZ,
    acs,
  };
}
