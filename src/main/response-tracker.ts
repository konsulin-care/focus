/**
 * F.O.C.U.S. Assessment - Response Tracker
 * 
 * Dedicated class for managing response validation during test execution.
 * Handles pending response tracking, validation, and error detection.
 */

import { TestConfig, StimulusType, TestEvent, PendingResponse } from './types';

/**
 * Result of processing a response.
 */
export interface ResponseResult {
  trialIndex: number;
  stimulusType: StimulusType;
  responseCorrect: boolean;
  responseTimeMs: number;
  responseCount: number;
  isAnticipatory: boolean;
  isCommissionError: boolean;
}

/**
 * ResponseTracker manages response validation during test execution.
 * 
 * Responsibilities:
 * - Track pending responses for current stimulus window
 * - Validate responses against stimulus onset timing
 * - Detect anticipatory responses (< threshold)
 * - Detect commission errors (responses outside valid window)
 * - Track response counts per trial (multiple responses)
 */
export class ResponseTracker {
  private config: TestConfig;
  private anticipatoryThresholdMs: number;
  
  private pendingResponses: PendingResponse[] = [];
  private responseCountPerTrial: Map<number, number> = new Map();

  constructor(
    config: TestConfig,
    anticipatoryThresholdMs: number = 150
  ) {
    this.config = config;
    this.anticipatoryThresholdMs = anticipatoryThresholdMs;
  }

  /**
   * Add a pending response when a stimulus is presented.
   */
  addPendingResponse(data: PendingResponse): void {
    this.pendingResponses.push(data);
  }

  /**
   * Remove a pending response after a valid response is recorded.
   */
  removePendingResponse(trialIndex: number): void {
    const idx = this.pendingResponses.findIndex(pr => pr.trialIndex === trialIndex);
    if (idx !== -1) {
      this.pendingResponses.splice(idx, 1);
    }
  }

  /**
   * Get all pending responses.
   */
  getPendingResponses(): ReadonlyArray<PendingResponse> {
    return this.pendingResponses;
  }

  /**
   * Get the number of responses for a specific trial.
   */
  getResponseCount(trialIndex: number): number {
    return this.responseCountPerTrial.get(trialIndex) || 0;
  }

  /**
   * Clear all tracked data.
   */
  clear(): void {
    this.pendingResponses = [];
    this.responseCountPerTrial.clear();
  }

  /**
   * Process a user response.
   * 
   * @param responseTimestampNs - Nanosecond timestamp of the response
   * @param actualResponse - Whether the user actually responded (clicked/pressed)
   * @param stimulusType - Type of stimulus for the trial
   * @param trialIndex - Trial index
   * @returns ResponseResult if valid, null if this is a duplicate response
   */
  processResponse(
    responseTimestampNs: bigint,
    actualResponse: boolean,
    stimulusType: StimulusType,
    trialIndex: number
  ): ResponseResult | null {
    // Check if this trial already has a response (duplicate)
    const existingCount = this.getResponseCount(trialIndex);
    if (existingCount > 0) {
      // Increment count but don't process as new response
      this.responseCountPerTrial.set(trialIndex, existingCount + 1);
      return null;
    }

    // Find valid pending response within ISI window
    const pendingIndex = this.pendingResponses.findIndex(pr => {
      const elapsedMs = Number(responseTimestampNs - pr.onsetTimestampNs) / 1_000_000;
      return elapsedMs < this.config.interstimulusIntervalMs;
    });

    if (pendingIndex === -1) {
      // Commission error - response outside valid window or no pending trial
      this.responseCountPerTrial.set(trialIndex, existingCount + 1);
      return {
        trialIndex: -1,
        stimulusType: 'non-target',
        responseCorrect: false,
        responseTimeMs: 0,
        responseCount: existingCount + 1,
        isAnticipatory: false,
        isCommissionError: true,
      };
    }

    const pending = this.pendingResponses[pendingIndex];
    
    // Calculate response time from stimulus onset
    const responseTimeMs = Number(responseTimestampNs - pending.onsetTimestampNs) / 1_000_000;
    
    // Determine if response is anticipatory
    const isAnticipatory = responseTimeMs < this.anticipatoryThresholdMs;
    
    // Determine if response was correct (compare user's actual response to what was expected)
    const isCorrect = pending.expectedResponse === actualResponse;
    
    // Remove from pending responses
    this.pendingResponses.splice(pendingIndex, 1);
    
    // Increment response count
    this.responseCountPerTrial.set(trialIndex, existingCount + 1);
    
    return {
      trialIndex,
      stimulusType,
      responseCorrect: isCorrect,
      responseTimeMs,
      responseCount: existingCount + 1,
      isAnticipatory,
      isCommissionError: false,
    };
  }

  /**
   * Create a TestEvent from a ResponseResult.
   * 
   * @param result - The response result
   * @param timestampNs - The timestamp of the response
   * @returns TestEvent for recording in the scheduler
   */
  createEventFromResult(result: ResponseResult, timestampNs: bigint): TestEvent {
    return {
      trialIndex: result.trialIndex,
      stimulusType: result.stimulusType,
      timestampNs: timestampNs.toString(),
      eventType: 'response',
      responseCorrect: result.responseCorrect,
      responseTimeMs: result.responseTimeMs,
      responseCount: result.responseCount,
      isAnticipatory: result.isAnticipatory,
    };
  }
}
