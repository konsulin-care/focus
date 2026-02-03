/**
 * F.O.C.U.S. Assessment - Attention Metrics
 * 
 * Utility functions for calculating comprehensive attention metrics with ACS scoring.
 */

import { TestEvent, TestConfig } from '../types/electronAPI';
import { SubjectInfo, AttentionMetrics } from '../types/trial';
import { getNormativeStats } from './normative-data';
import { zScore, calculateStdDev, calculateMean, calculateVariability } from './basic-stats';
import { calculateDPrime } from './clinical-metrics';
import { processTestEvents } from './trial-processing';
import { TRIAL_CONSTANTS } from './trial-constants';

/**
 * Calculate comprehensive attention metrics with ACS scoring.
 * 
 * @param events - Array of raw test events
 * @param subjectInfo - Subject demographic information
 * @returns Comprehensive attention metrics
 */
export function calculateAttentionMetrics(
  events: TestEvent[],
  subjectInfo: SubjectInfo
): AttentionMetrics {
  // Process events into trials
  // Note: Using minimal config for event processing
  const minimalConfig = { totalTrials: events.filter(e => e.eventType === 'stimulus-onset').length };
  const trials = processTestEvents(events, minimalConfig as TestConfig);
  
  // Count outcomes
  const hits = trials.filter(t => t.outcome === 'hit').length;
  const omissions = trials.filter(t => t.outcome === 'omission').length;
  const commissions = trials.filter(t => t.outcome === 'commission').length;
  const correctRejections = trials.filter(t => t.outcome === 'correct-rejection').length;
  const anticipatoryResponses = trials.filter(t => t.isAnticipatory).length;
  const multipleResponses = trials.filter(t => t.isMultipleResponse).length;
  
  // Calculate totals
  const totalTargets = hits + omissions;
  const totalNonTargets = commissions + correctRejections;
  const validTargets = totalTargets - anticipatoryResponses;
  
  // Calculate percentages
  const omissionPercent = totalTargets > 0 ? (omissions / totalTargets) * 100 : 0;
  const commissionPercent = totalNonTargets > 0 ? (commissions / totalNonTargets) * 100 : 0;
  
  // Collect response times for hits
  const hitResponseTimes = trials
    .filter(t => t.outcome === 'hit' && t.responseTimeMs !== null && !t.isAnticipatory)
    .map(t => t.responseTimeMs as number);
  
  const meanResponseTimeMs = hitResponseTimes.length > 0
    ? calculateMean(hitResponseTimes)
    : 0;
  
  // Calculate variability
  const variability = calculateVariability(hitResponseTimes, meanResponseTimeMs);
  
  // Split trials for ACS calculation
  const midpoint = Math.floor(trials.length / 2);
  const firstHalfTrials = trials.slice(0, midpoint);
  const secondHalfTrials = trials.slice(midpoint);
  const totalTrials = trials;
  
  // First half: Response Time Z
  const firstHalfHits = firstHalfTrials.filter(t => t.outcome === 'hit' && !t.isAnticipatory);
  const firstHalfResponseTimes = firstHalfHits.map(t => t.responseTimeMs as number);
  const firstHalfMeanRT = firstHalfResponseTimes.length > 0
    ? calculateMean(firstHalfResponseTimes)
    : meanResponseTimeMs;
  const firstHalfSD = calculateStdDev(firstHalfResponseTimes);
  
  // Second half: D' Z
  const secondHalfHits = secondHalfTrials.filter(t => t.outcome === 'hit').length;
  const secondHalfOmissions = secondHalfTrials.filter(t => t.outcome === 'omission').length;
  const secondHalfCommissions = secondHalfTrials.filter(t => t.outcome === 'commission').length;
  const secondHalfCorrectRejections = secondHalfTrials.filter(t => t.outcome === 'correct-rejection').length;
  
  const secondHalfTargets = secondHalfHits + secondHalfOmissions;
  const secondHalfNonTargets = secondHalfCommissions + secondHalfCorrectRejections;
  
  const hitRate = secondHalfTargets > 0 ? secondHalfHits / secondHalfTargets : 0.5;
  const falseAlarmRate = secondHalfNonTargets > 0 ? secondHalfCommissions / secondHalfNonTargets : 0.5;
  const dPrime = calculateDPrime(hitRate, falseAlarmRate);
  
  // Total: Variability Z
  const hitResponseTimesAll = totalTrials
    .filter(t => t.outcome === 'hit' && !t.isAnticipatory)
    .map(t => t.responseTimeMs as number);
  const overallMeanRT = hitResponseTimesAll.length > 0
    ? calculateMean(hitResponseTimesAll)
    : meanResponseTimeMs;
  const overallVariability = calculateVariability(hitResponseTimesAll, overallMeanRT);
  
  // Get normative data
  const normativeStats = getNormativeStats(subjectInfo.age, subjectInfo.gender);
  
  // Calculate proportional scaling factor based on trial count
  // For n trials, use SD * sqrt(n/648) to scale Z-scores proportionally
  const trialCount = trials.length;
  const scalingFactor = Math.sqrt(trialCount / TRIAL_CONSTANTS.FULL_TEST_TRIALS);
  
  // Calculate Z-scores
  let rtZ = 0;
  let dPrimeZ = 0;
  let variabilityZ = 0;
  
  if (normativeStats) {
    // Response Time Z (first half) - note: higher RT is worse, so we negate
    // Apply proportional scaling
    rtZ = -zScore(firstHalfMeanRT, normativeStats.responseTimeMean, normativeStats.responseTimeSD) * scalingFactor;
    
    // D' Z (second half) - higher is better
    dPrimeZ = zScore(dPrime, normativeStats.dPrimeMean, normativeStats.dPrimeSD) * scalingFactor;
    
    // Variability Z (total) - higher variability is worse, so we negate
    variabilityZ = -zScore(overallVariability, normativeStats.variabilityMean, normativeStats.variabilitySD) * scalingFactor;
  }
  
  // Calculate ACS: scaled Z-scores + constant
  // The constant (1.80) is adjusted proportionally: 1.80 * scalingFactor
  // Note: Z-scores are already scaled individually (lines 112, 115, 118), so no additional scaling here
  const acs = (rtZ + dPrimeZ + variabilityZ) + (TRIAL_CONSTANTS.ACS_CONSTANT * scalingFactor);
  
  // Interpret ACS
  let acsInterpretation: 'normal' | 'borderline' | 'not-within-normal-limits';
  if (acs >= TRIAL_CONSTANTS.ACS_NORMAL_THRESHOLD * scalingFactor) {
    acsInterpretation = 'normal';
  } else if (acs >= TRIAL_CONSTANTS.ACS_BORDERLINE_THRESHOLD * scalingFactor) {
    acsInterpretation = 'borderline';
  } else {
    acsInterpretation = 'not-within-normal-limits';
  }
  
  // Validity assessment - proportional to trial count
  const anticipatoryPercent = totalTargets > 0 ? (anticipatoryResponses / totalTargets) * 100 : 0;
  const minValidResponses = Math.max(TRIAL_CONSTANTS.MIN_VALID_RESPONSES, Math.floor(10 * scalingFactor));
  let validity: AttentionMetrics['validity'];
  
  if (anticipatoryPercent > TRIAL_CONSTANTS.MAX_ANTICIPATORY_PERCENT) {
    validity = {
      anticipatoryResponses,
      valid: false,
      exclusionReason: `High anticipatory response rate (${anticipatoryPercent.toFixed(1)}% of targets)`,
    };
  } else if (hitResponseTimes.length < minValidResponses) {
    validity = {
      anticipatoryResponses,
      valid: false,
      exclusionReason: `Insufficient valid response data (${hitResponseTimes.length}/${minValidResponses} minimum)`,
    };
  } else {
    validity = {
      anticipatoryResponses,
      valid: true,
    };
  }
  
  return {
    // Raw response counts for accurate total responses calculation
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
    meanResponseTimeMs,
    validity,
    trialCount,
    scalingFactor,
    zScores: {
      responseTime: rtZ,
      dPrime: dPrimeZ,
      variability: variabilityZ,
    },
  };
}
