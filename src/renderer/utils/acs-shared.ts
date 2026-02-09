/**
 * F.O.C.U.S. Assessment - Shared ACS Calculation Logic
 * 
 * Single source of truth for ACS calculations used by both:
 * - calculateAttentionMetrics (results display)
 * - generateAcsCalculationDetails (modal display)
 */

import { TestEvent } from '../types/electronAPI';
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
  
  // Z-scores (null when normative data is unavailable)
  rtZ: number | null;
  dPrimeZ: number | null;
  variabilityZ: number | null;
  
  // Final ACS (null when normative data is unavailable)
  acs: number | null;
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
  });
  
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
  
  // === Z-Score Calculations (null if no normative data) ===
  let rtZ: number | null = null;
  let dPrimeZ: number | null = null;
  let variabilityZ: number | null = null;
  
  if (normativeStats) {
    const responseTimeSD = normativeStats.responseTimeSD;
    const dPrimeSD = normativeStats.dPrimeSD;
    const variabilitySD = normativeStats.variabilitySD;
    
    // Guard against division by zero by checking for positive finite values
    if (Number.isFinite(responseTimeSD) && responseTimeSD > 0) {
      rtZ = (firstHalfMeanRT - normativeStats.responseTimeMean) / responseTimeSD;
    }
    
    if (Number.isFinite(dPrimeSD) && dPrimeSD > 0) {
      dPrimeZ = (dPrime - normativeStats.dPrimeMean) / dPrimeSD;
    }
    
    if (Number.isFinite(variabilitySD) && variabilitySD > 0) {
      variabilityZ = (variability - normativeStats.variabilityMean) / variabilitySD;
    }
  }
  
  // === Final ACS Calculation (null if normative data unavailable) ===
  const hasNormativeData = rtZ !== null || dPrimeZ !== null || variabilityZ !== null;
  const acs = hasNormativeData
    ? (rtZ ?? 0) + (dPrimeZ ?? 0) + (variabilityZ ?? 0) + TRIAL_CONSTANTS.ACS_CONSTANT
    : null;
  
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
