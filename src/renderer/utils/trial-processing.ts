/**
 * F.O.C.U.S. Assessment - Trial Processing Utilities
 * 
 * Utility functions for processing raw test events into trial results
 * and determining trial outcomes.
 */

import { TestEvent, TestConfig } from '../types/electronAPI';
import { TrialResult, TrialOutcome } from '../types/trial';
import { TRIAL_CONSTANTS } from './trial-constants';

/**
 * Calculate response time in milliseconds from onset to response.
 * 
 * @param onsetTimestampNs - Stimulus onset timestamp in nanoseconds
 * @param responseTimestampNs - Response timestamp in nanoseconds
 * @returns Response time in milliseconds
 */
export function calculateResponseTime(
  onsetTimestampNs: bigint,
  responseTimestampNs: bigint
): number {
  const diffNs = responseTimestampNs - onsetTimestampNs;
  return Number(diffNs) / 1_000_000;
}

/**
 * Check if response is anticipatory (within 150ms of stimulus onset).
 * 
 * @param responseTimeMs - Response time in milliseconds
 * @returns True if response is anticipatory
 */
export function isAnticipatory(responseTimeMs: number): boolean {
  return responseTimeMs < TRIAL_CONSTANTS.ANTICIPATORY_THRESHOLD_MS;
}

/**
 * Determine trial outcome from stimulus type and response correctness.
 * 
 * @param stimulusType - Type of stimulus presented
 * @param responseCorrect - Whether the response was correct
 * @param hadResponse - Whether a response was recorded
 * @returns Trial outcome
 */
export function determineTrialOutcome(
  stimulusType: 'target' | 'non-target',
  responseCorrect: boolean,
  hadResponse: boolean
): TrialOutcome {
  if (stimulusType === 'target') {
    if (hadResponse && responseCorrect) {
      return 'hit';
    } else if (!hadResponse) {
      return 'omission';
    } else {
      // Response to target but incorrect (shouldn't happen with current logic)
      return 'omission';
    }
  } else {
    // Non-target stimulus
    if (!hadResponse) {
      return 'correct-rejection';
    } else if (!responseCorrect) {
      return 'commission';
    } else {
      // Response to non-target but marked correct (shouldn't happen)
      return 'commission';
    }
  }
}

/**
 * Process raw test events into an array of trial results.
 * 
 * @param events - Array of raw test events
 * @param config - Test configuration
 * @returns Array of processed trial results
 */
export function processTestEvents(
  events: TestEvent[],
  config: TestConfig
): TrialResult[] {
  const trialResults: TrialResult[] = [];
  
  // Group events by trial and find onset/response pairs
  const trialOnsets: Map<number, TestEvent> = new Map();
  const trialResponses: Map<number, TestEvent[]> = new Map();
  
  // First pass: collect onsets and responses per trial
  for (const event of events) {
    if (event.eventType === 'stimulus-onset') {
      trialOnsets.set(event.trialIndex, event);
      trialResponses.set(event.trialIndex, []);
    } else if (event.eventType === 'response') {
      const responses = trialResponses.get(event.trialIndex);
      if (responses) {
        responses.push(event);
      }
    }
  }
  
  // Process each trial
  for (let i = 0; i < config.totalTrials; i++) {
    const onset = trialOnsets.get(i);
    const responses = trialResponses.get(i) || [];
    
    if (!onset) {
      // No onset event for this trial - should not happen
      continue;
    }
    
    const firstResponse = responses[0];
    const responseCount = responses.length;
    
    let responseTimeMs: number | null = null;
    let isAnticipatoryFlag = false;
    let responseCorrect = false;
    let hadResponse = false;
    
    if (firstResponse) {
      hadResponse = true;
      responseCorrect = firstResponse.responseCorrect ?? false;
      responseTimeMs = firstResponse.responseTimeMs ?? null;
      isAnticipatoryFlag = firstResponse.isAnticipatory ?? false;
    }
    
    const outcome = determineTrialOutcome(
      onset.stimulusType,
      responseCorrect,
      hadResponse
    );
    
    trialResults.push({
      trialIndex: i,
      stimulusType: onset.stimulusType,
      outcome,
      responseTimeMs,
      isAnticipatory: isAnticipatoryFlag,
      isMultipleResponse: responseCount > 1,
      followsCommission: false, // Will be set in second pass
    });
  }
  
  // Second pass: mark trials following commission errors
  for (let i = 1; i < trialResults.length; i++) {
    if (trialResults[i - 1].outcome === 'commission') {
      trialResults[i] = {
        ...trialResults[i],
        followsCommission: true,
        postCommissionResponseTimeMs: trialResults[i].responseTimeMs ?? undefined,
      };
    }
  }
  
  return trialResults;
}
