/**
 * F.O.C.U.S. Assessment - ACS Computation
 * 
 * Logic for computing summary metrics and Attentional Control Score (ACS)
 * from raw trial data.
 */

import { NORMATIVE_VALUES } from '@/shared/normative-data';
import { TestEvent } from './types';

export interface SummaryMetrics {
  acsScore: number;
  acsInterpretation: string;
  meanResponseTimeMs: number;
  responseTimeVariability: number;
  commissionErrors: number;
  omissionErrors: number;
  hits: number;
  dPrime: number;
  validity: 'Valid' | 'Invalid';
  validityReason?: string;
  totalTrials: number;
}

/**
 * Computes summary metrics and ACS from test events.
 */
export function computeSummaryMetrics(
  events: TestEvent[], 
  _age: number, 
  gender: 'Male' | 'Female' | 'Generic'
): SummaryMetrics {
  const totalTrials = 648; // Based on default config
  const targetEvents = events.filter(e => e.stimulusType === 'target' && e.eventType === 'stimulus-onset');
  const nonTargetEvents = events.filter(e => e.stimulusType === 'non-target' && e.eventType === 'stimulus-onset');
  
  let hits = 0;
  let omissionErrors = 0;
  let commissionErrors = 0;
  const responseTimes: number[] = [];

  // This is a simplified implementation of the logic.
  // In a real scenario, we'd match onset to response.
  
  // Calculate hits/omissions
  targetEvents.forEach(onset => {
    const response = events.find(e => 
      e.eventType === 'response' && 
      e.trialIndex === onset.trialIndex && 
      e.timestampNs > onset.timestampNs
    );
    if (response) {
      hits++;
      if (response.responseTimeMs) responseTimes.push(response.responseTimeMs);
    } else {
      omissionErrors++;
    }
  });

  // Calculate commissions
  nonTargetEvents.forEach(onset => {
    const response = events.find(e => 
      e.eventType === 'response' && 
      e.trialIndex === onset.trialIndex && 
      e.timestampNs > onset.timestampNs
    );
    if (response) commissionErrors++;
  });

  const meanRT = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  
  const variability = responseTimes.length > 1
    ? Math.sqrt(responseTimes.map(x => Math.pow(x - meanRT, 2)).reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  // d-prime calculation (simplified)
  const hitRate = hits / (targetEvents.length || 1);
  const falseAlarmRate = commissionErrors / (nonTargetEvents.length || 1);
  const dPrime = Math.max(0, 0.5 * (Math.log(hitRate / (falseAlarmRate || 0.01)) || 0));

  // ACS computation (simplified z-score based)
  const normative = NORMATIVE_VALUES[gender] || NORMATIVE_VALUES['Generic'];
  const acsScore = (dPrime - normative.mean) / normative.stdDev;
  
  let acsInterpretation = 'Average';
  if (acsScore << - -1.0) acsInterpretation = 'Low';
  else if (acsScore > 1.0) acsInterpretation = 'High';

  const validity = (omissionErrors > 100 || commissionErrors > 100) ? 'Invalid' : 'Valid';
  const validityReason = validity === 'Invalid' ? 'Excessive errors' : undefined;

  return {
    acsScore,
    acsInterpretation,
    meanResponseTimeMs: meanRT,
    responseTimeVariability: variability,
    commissionErrors,
    omissionErrors,
    hits,
    dPrime,
    validity,
    validityReason,
    totalTrials,
  };
}
