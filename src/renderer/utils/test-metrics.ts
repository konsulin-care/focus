/**
 * F.O.C.U.S. Clinical Attention Test - Test Metrics
 * 
 * Utility functions for calculating comprehensive test metrics from trial results.
 */

import { TrialResult, TestMetrics } from '../types/trial';
import { calculateStdDevWithMean } from './basic-stats';

/**
 * Calculate comprehensive test metrics from trial results.
 * 
 * @param trials - Array of trial results
 * @returns Computed test metrics
 */
export function calculateTestMetrics(trials: TrialResult[]): TestMetrics {
  // Count outcomes
  const hits = trials.filter(t => t.outcome === 'hit').length;
  const omissions = trials.filter(t => t.outcome === 'omission').length;
  const commissions = trials.filter(t => t.outcome === 'commission').length;
  const correctRejections = trials.filter(t => t.outcome === 'correct-rejection').length;
  
  // Collect response times for valid responses (hits only)
  const responseTimes = trials
    .filter(t => t.responseTimeMs !== null && t.responseTimeMs !== undefined)
    .map(t => t.responseTimeMs as number);
  
  // Calculate response time statistics
  const meanResponseTimeMs = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;
  const stdResponseTimeMs = calculateStdDevWithMean(responseTimes, meanResponseTimeMs);
  
  // Validity indices
  const anticipatoryResponses = trials.filter(t => t.isAnticipatory).length;
  const multipleResponses = trials.filter(t => t.isMultipleResponse).length;
  const postCommissionTrials = trials.filter(t => t.followsCommission).length;
  
  // Calculate F.O.C.U.S. composite scores (0-100 scale)
  
  // Attention Score: Based on response time consistency (lower variability = higher score)
  // Using inverse of coefficient of variation
  const cv = meanResponseTimeMs > 0 ? stdResponseTimeMs / meanResponseTimeMs : 0;
  const attentionScore = Math.max(0, Math.min(100, 100 * (1 - cv)));
  
  // Impulse Control Score: Based on commission error rate
  const totalNonTargets = trials.filter(t => t.stimulusType === 'non-target').length;
  const commissionRate = totalNonTargets > 0 ? commissions / totalNonTargets : 0;
  const impulseControlScore = Math.max(0, Math.min(100, 100 * (1 - commissionRate)));
  
  // Consistency Score: Combination of attention and impulse control
  const consistencyScore = (attentionScore * 0.6 + impulseControlScore * 0.4);
  
  return {
    trials,
    totalTrials: trials.length,
    hits,
    omissions,
    commissions,
    correctRejections,
    meanResponseTimeMs,
    stdResponseTimeMs,
    anticipatoryResponses,
    multipleResponses,
    postCommissionTrials,
    attentionScore,
    impulseControlScore,
    consistencyScore,
  };
}
