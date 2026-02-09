/**
 * F.O.C.U.S. Assessment - Attention Metrics
 * 
 * Utility functions for calculating comprehensive attention metrics with ACS scoring.
 */

import { TestEvent, TestConfig } from '../types/electronAPI';
import { SubjectInfo, AttentionMetrics } from '../types/trial';
import { getNormativeStats } from './normative-data';
import { calculateMean, calculateVariability } from './basic-stats';
import { calculateDPrime } from './clinical-metrics';
import { processTestEvents } from './trial-processing';
import { TRIAL_CONSTANTS } from './trial-constants';

/**
 * Calculate Z-score with optional scaled normative SD for abbreviated tests.
 * Formula: Z = (X - μ) / (σ × SF)
 * If scalingFactor is null/undefined, uses unscaled SD: Z = (X - μ) / σ
 */
function zScoreScaled(value: number, mean: number, sd: number, scalingFactor?: number | null): number {
  if (scalingFactor) {
    const scaledSD = sd * scalingFactor;
    return (value - mean) / scaledSD;
  }
  return (value - mean) / sd;
}

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
  
  // DEBUG: Log d' calculation details
  console.log('[DEBUG] === D Prime Calculation ===');
  console.log('[DEBUG] Second Half Stats:');
  console.log('[DEBUG]   Hits:', secondHalfHits, 'Omissions:', secondHalfOmissions);
  console.log('[DEBUG]   Commissions:', secondHalfCommissions, 'Correct Rejections:', secondHalfCorrectRejections);
  console.log('[DEBUG]   Targets:', secondHalfTargets, 'Non-Targets:', secondHalfNonTargets);
  console.log('[DEBUG] Hit Rate:', hitRate.toFixed(6), 'False Alarm Rate:', falseAlarmRate.toFixed(6));
  console.log('[DEBUG] dPrime (raw):', dPrime);
  
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
  
  // DEBUG: Log normative data
  console.log('[DEBUG] === Normative Data ===');
  console.log('[DEBUG] Age:', subjectInfo.age, 'Gender:', subjectInfo.gender);
  console.log('[DEBUG] Normative Stats:', normativeStats);
  if (normativeStats) {
    console.log('[DEBUG] dPrimeMean:', normativeStats.dPrimeMean, 'dPrimeSD:', normativeStats.dPrimeSD);
    console.log('[DEBUG] responseTimeMean:', normativeStats.responseTimeMean, 'responseTimeSD:', normativeStats.responseTimeSD);
    console.log('[DEBUG] variabilityMean:', normativeStats.variabilityMean, 'variabilitySD:', normativeStats.variabilitySD);
  }
  
  // Calculate Z-scores with normative SD (no scaling)
  const trialCount = trials.length;
  let rtZ = 0;
  let dPrimeZ = 0;
  let variabilityZ = 0;
  
  if (normativeStats) {
    // Response Time Z (first half) - direct Z-score (higher RT = more similar to ADHD)
    // Z = (X - μ) / σ
    rtZ = zScoreScaled(firstHalfMeanRT, normativeStats.responseTimeMean, normativeStats.responseTimeSD);
    
    // D' Z (second half) - direct Z-score (higher D' = better attention)
    // Note: D' is calculated with TOVA-compliant sign handling:
    // - Perfect performance (100% hits, 0% FA) gives high positive D'
    // - Poor performance gives low/negative D'
    // - Higher D' Z-score indicates better than average attention
    dPrimeZ = zScoreScaled(dPrime, normativeStats.dPrimeMean, normativeStats.dPrimeSD);
    
    // DEBUG: Log dPrimeZ calculation
    console.log('[DEBUG] === Z-Score Calculations ===');
    console.log('[DEBUG] dPrime:', dPrime);
    console.log('[DEBUG] zScoreScaled(dPrime,', normativeStats.dPrimeMean, ',', normativeStats.dPrimeSD, ') =', (dPrime - normativeStats.dPrimeMean) / normativeStats.dPrimeSD);
    console.log('[DEBUG] dPrimeZ:', dPrimeZ);
    
    // Variability Z (total) - direct Z-score (higher variability = more similar to ADHD)
    variabilityZ = zScoreScaled(overallVariability, normativeStats.variabilityMean, normativeStats.variabilitySD);
  }
  
  // Calculate ACS: scaled Z-scores + constant (constant NOT scaled)
  const acs = rtZ + dPrimeZ + variabilityZ + TRIAL_CONSTANTS.ACS_CONSTANT;
  
  // DEBUG: Log final ACS calculation
  console.log('[DEBUG] === Final ACS Calculation ===');
  console.log('[DEBUG] rtZ:', rtZ, 'dPrimeZ:', dPrimeZ, 'variabilityZ:', variabilityZ);
  console.log('[DEBUG] Using normative SDs (no scaling):');
  console.log('[DEBUG]   RT SD:', normativeStats?.responseTimeSD);
  console.log('[DEBUG]   DPrime SD:', normativeStats?.dPrimeSD);
  console.log('[DEBUG]   Var SD:', normativeStats?.variabilitySD);
  console.log('[DEBUG] ACS Constant:', TRIAL_CONSTANTS.ACS_CONSTANT);
  console.log('[DEBUG] Final ACS:', acs);
  
  // Interpret ACS
  let acsInterpretation: 'normal' | 'borderline' | 'not-within-normal-limits';
  if (acs >= TRIAL_CONSTANTS.ACS_NORMAL_THRESHOLD) {
    acsInterpretation = 'normal';
  } else if (acs >= TRIAL_CONSTANTS.ACS_BORDERLINE_THRESHOLD) {
    acsInterpretation = 'borderline';
  } else {
    acsInterpretation = 'not-within-normal-limits';
  }
  
  // Validity assessment
  const anticipatoryPercent = totalTargets > 0 ? (anticipatoryResponses / totalTargets) * 100 : 0;
  const minValidResponses = TRIAL_CONSTANTS.MIN_VALID_RESPONSES;
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
    scalingFactor: 1,
    zScores: {
      responseTime: rtZ,
      dPrime: dPrimeZ,
      variability: variabilityZ,
    },
  };
}
