/**
 * F.O.C.U.S. Assessment - Shared Trial Processing
 *
 * Trial processing logic used by both renderer (metrics calculation) and
 * main process (database persistence). This ensures TrialResult fields
 * are computed consistently and stored completely.
 *
 * This module is process-agnostic: it only depends on types from
 * src/main/types.ts and does not import any renderer-specific code.
 */

import type { TestEvent, TestConfig, StimulusType } from '@/main/types';
import { TRIAL_CONSTANTS } from '@/shared/utils/constants';

/**
 * Outcome of a single trial after processing.
 */
export type TrialOutcome = 'hit' | 'omission' | 'commission' | 'correct-rejection';

/**
 * Result of processing a single trial from raw events.
 */
export interface TrialResult {
  /** Index of the trial (0-based) */
  trialIndex: number;

  /** Type of stimulus presented */
  stimulusType: StimulusType;

  /** Primary behavioral outcome */
  outcome: TrialOutcome;

  /** Response time in milliseconds, null if no response */
  responseTimeMs: number | null;

  /** True if response was within 150ms of stimulus onset */
  isAnticipatory: boolean;

  /** True if more than one response was recorded in this trial */
  isMultipleResponse: boolean;

  /** True if this trial immediately follows a commission error */
  followsCommission: boolean;

  /** Response time for post-commission trials, if applicable */
  postCommissionResponseTimeMs?: number;
}

/**
 * Calculate response time in milliseconds from onset to response.
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
 */
export function isAnticipatory(responseTimeMs: number): boolean {
  return responseTimeMs < TRIAL_CONSTANTS.ANTICIPATORY_THRESHOLD_MS;
}

/**
 * Determine trial outcome from stimulus type and response correctness.
 */
export function determineTrialOutcome(
  stimulusType: StimulusType,
  responseCorrect: boolean,
  hadResponse: boolean
): TrialOutcome {
  if (stimulusType === 'target') {
    if (hadResponse && responseCorrect) {
      return 'hit';
    }
    return 'omission';
  } else {
    // Non-target stimulus
    if (!hadResponse) {
      return 'correct-rejection';
    }
    return 'commission';
  }
}

/**
 * Process raw test events into an array of trial results.
 * This is the single source of truth for deriving behavioral outcomes.
 *
 * @param events - Array of raw test events
 * @param config - Test configuration (partial, only totalTrials is required)
 * @returns Array of processed trial results with all derived fields
 */
export function processTestEvents(
  events: TestEvent[],
  config: Partial<TestConfig> & { totalTrials: number }
): TrialResult[] {
  const trialResults: TrialResult[] = [];

  // Group events by trial: onset events + response arrays
  const trialOnsets: Map<number, TestEvent> = new Map();
  const trialResponses: Map<number, TestEvent[]> = new Map();

  // First pass: collect all onsets and responses per trial
  for (const event of events) {
    if (event.eventType === 'stimulus-onset') {
      trialOnsets.set(event.trialIndex, event);
      if (!trialResponses.has(event.trialIndex)) {
        trialResponses.set(event.trialIndex, []);
      }
    } else if (event.eventType === 'response') {
      if (!trialResponses.has(event.trialIndex)) {
        trialResponses.set(event.trialIndex, []);
      }
      trialResponses.get(event.trialIndex)!.push(event);
    }
  }

  // Process each trial in order
  for (let i = 0; i < config.totalTrials; i++) {
    const onset = trialOnsets.get(i);
    const responses = trialResponses.get(i) || [];

    if (!onset) {
      // No onset event for this trial - should not happen in normal operation
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

    const outcome = determineTrialOutcome(onset.stimulusType, responseCorrect, hadResponse);

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

  // Second pass: mark trials that follow commission errors
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
