/**
 * F.O.C.U.S. Assessment - Trial Scheduler
 * 
 * Dedicated class for managing trial timing and stimulus presentation.
 * Handles drift-corrected scheduling with high-precision timestamps.
 * Delegates response tracking to ResponseTracker.
 */

import { TestConfig, StimulusType, TestEvent, TestEventType } from './types';
import { getHighPrecisionTime } from './timing';
import { ResponseTracker } from './response-tracker';

export interface TestCompleteData {
  events: TestEvent[];
  startTimeNs: string;
  elapsedTimeNs: string;
}

export class TrialScheduler {
  private config: TestConfig;
  private responseTracker: ResponseTracker;
  private onStimulusChange: (event: TestEvent) => void;
  private onTestComplete: (data: TestCompleteData) => void;
  
  // State (moved from test-engine.ts module variables)
  private testRunning = false;
  private testEvents: TestEvent[] = [];
  private currentTrialIndex = 0;
  private currentStimulusType: StimulusType = 'target';
  private trialSequence: StimulusType[] = [];
  private testStartTimeNs: bigint = 0n;

  constructor(
    config: TestConfig,
    responseTracker: ResponseTracker,
    onStimulusChange: (event: TestEvent) => void,
    onTestComplete: (data: TestCompleteData) => void
  ) {
    this.config = config;
    this.responseTracker = responseTracker;
    this.onStimulusChange = onStimulusChange;
    this.onTestComplete = onTestComplete;
  }

  // ===========================================
  // Public API
  // ===========================================

  /**
   * Start the test sequence with the given trial sequence.
   * 
   * @param sequence - Array of stimulus types for the full test
   * @param startTimeNs - Start timestamp in nanoseconds
   */
  start(sequence: StimulusType[], startTimeNs: bigint): void {
    if (this.testRunning) return;
    
    // Guard: Validate sequence length matches config.totalTrials
    if (sequence.length !== this.config.totalTrials) {
      throw new Error(
        `Sequence length (${sequence.length}) does not match config.totalTrials (${this.config.totalTrials}). ` +
        'Clamping or silently adding trials would skew attention metrics.'
      );
    }
    
    this.testRunning = true;
    this.testEvents = [];
    this.currentTrialIndex = 0;
    this.currentStimulusType = 'target';
    this.trialSequence = sequence;
    this.testStartTimeNs = startTimeNs;
    
    // Clear response tracker state
    this.responseTracker.clear();
    
    this.scheduleNextTrial();
  }

  /**
   * Stop the test prematurely.
   */
  stop(): void {
    this.testRunning = false;
    this.complete();
  }

  /**
   * Check if the test is currently running.
   * 
   * @returns true if test is running
   */
  isRunning(): boolean {
    return this.testRunning;
  }

  /**
   * Get the current trial index.
   * 
   * @returns Current trial index (0-based)
   */
  getCurrentTrialIndex(): number {
    return this.currentTrialIndex;
  }

  // ===========================================
  // Response Tracking API (delegated to ResponseTracker)
  // ===========================================

  /**
   * Get all pending responses for the current stimulus window.
   * 
   * @returns Readonly array of pending responses
   */
  getPendingResponses(): ReadonlyArray<{
    trialIndex: number;
    stimulusType: StimulusType;
    onsetTimestampNs: bigint;
    expectedResponse: boolean;
  }> {
    return this.responseTracker.getPendingResponses();
  }

  /**
   * Add a pending response after stimulus onset.
   * Delegates to ResponseTracker.
   * 
   * @param data - Pending response data
   */
  addPendingResponse(data: {
    trialIndex: number;
    stimulusType: StimulusType;
    onsetTimestampNs: bigint;
    expectedResponse: boolean;
  }): void {
    this.responseTracker.addPendingResponse(data);
  }

  /**
   * Remove a pending response after a valid response is recorded.
   * Delegates to ResponseTracker.
   * 
   * @param trialIndex - Trial index to remove
   */
  removePendingResponse(trialIndex: number): void {
    this.responseTracker.removePendingResponse(trialIndex);
  }

  // ===========================================
  // Event Management API
  // ===========================================

  /**
   * Add a test event (e.g., response event).
   * 
   * @param event - Test event to add
   */
  addEvent(event: TestEvent): void {
    this.testEvents.push(event);
  }

  /**
   * Get all recorded test events.
   * 
   * @returns Array of test events
   */
  getEvents(): TestEvent[] {
    return this.testEvents;
  }

  /**
   * Get the test start timestamp.
   * 
   * @returns Start timestamp as bigint
   */
  getStartTimeNs(): bigint {
    return this.testStartTimeNs;
  }

  // ===========================================
  // Private Methods
  // ===========================================

  /**
   * Schedule the next trial using drift-corrected timing.
   */
  private scheduleNextTrial(): void {
    if (!this.testRunning || this.currentTrialIndex >= this.config.totalTrials) {
      this.complete();
      return;
    }

    // First trial: emit buffer-start and schedule stimulus
    if (this.currentTrialIndex === 0) {
      this.emitStimulusChange(-1, 'target', 'buffer-start');
      
      const bufferEndTime = this.testStartTimeNs + BigInt(this.config.bufferMs) * 1_000_000n;
      const now = getHighPrecisionTime();
      const delayMs = Math.max(0, Number(bufferEndTime - now) / 1_000_000);
      
      setTimeout(() => {
        if (!this.testRunning) return;
        this.presentStimulus();
      }, delayMs);
      return;
    }
    
    // For subsequent trials, use drift-corrected scheduling
    const trialStartTime = this.testStartTimeNs + 
      BigInt(this.config.bufferMs) * 1_000_000n +
      BigInt(this.currentTrialIndex * (this.config.stimulusDurationMs + this.config.interstimulusIntervalMs)) * 1_000_000n;
    const now = getHighPrecisionTime();
    const delayMs = Math.max(0, Number(trialStartTime - now) / 1_000_000);
    
    setTimeout(() => {
      if (!this.testRunning) return;
      this.presentStimulus();
    }, delayMs);
  }

  /**
   * Present a single stimulus with drift-corrected timing.
   */
  private presentStimulus(): void {
    if (!this.testRunning || this.currentTrialIndex >= this.config.totalTrials) {
      this.complete();
      return;
    }

    // Determine stimulus type from pre-generated sequence
    const isTarget = this.trialSequence[this.currentTrialIndex] === 'target';
    this.currentStimulusType = isTarget ? 'target' : 'non-target';
    const expectedResponse = isTarget;

    // Record stimulus onset
    this.emitStimulusChange(this.currentTrialIndex, this.currentStimulusType, 'stimulus-onset');

    // Store pending response for this trial in ResponseTracker
    const onsetTimestampNs = getHighPrecisionTime();
    this.responseTracker.addPendingResponse({
      trialIndex: this.currentTrialIndex,
      stimulusType: this.currentStimulusType,
      onsetTimestampNs,
      expectedResponse,
    });

    // Calculate absolute timing targets using drift-corrected scheduling
    const now = Number(getHighPrecisionTime() - this.testStartTimeNs) / 1_000_000;
    const trialStartTime = this.config.bufferMs + this.currentTrialIndex * (this.config.stimulusDurationMs + this.config.interstimulusIntervalMs);
    const stimulusEndTime = trialStartTime + this.config.stimulusDurationMs;
    const nextTrialStartTime = stimulusEndTime + this.config.interstimulusIntervalMs;
    
    const offsetDelay = Math.max(0, stimulusEndTime - now);
    setTimeout(() => {
      if (!this.testRunning) return;
      
      const currentNow = Number(getHighPrecisionTime() - this.testStartTimeNs) / 1_000_000;
      this.emitStimulusChange(this.currentTrialIndex, this.currentStimulusType, 'stimulus-offset');
      
      const remainingDelay = Math.max(0, nextTrialStartTime - currentNow);
      setTimeout(() => {
        if (!this.testRunning) return;
        this.currentTrialIndex++;
        this.scheduleNextTrial();
      }, remainingDelay);
    }, offsetDelay);
  }

  /**
   * Complete the test and send results.
   */
  private complete(): void {
    this.testRunning = false;
    console.log(`Test completed. Total events: ${this.testEvents.length}`);
    
    const endTimeNs = getHighPrecisionTime();
    const elapsedTimeNs = endTimeNs - this.testStartTimeNs;
    
    this.onTestComplete({
      events: this.testEvents,
      startTimeNs: this.testStartTimeNs.toString(),
      elapsedTimeNs: elapsedTimeNs.toString()
    });
  }

  /**
   * Emit a stimulus change event.
   * 
   * @param trialIndex - Trial index
   * @param stimulusType - Type of stimulus
   * @param eventType - Type of event
   */
  private emitStimulusChange(
    trialIndex: number, 
    stimulusType: StimulusType, 
    eventType: TestEventType
  ): void {
    const timestampNs = getHighPrecisionTime().toString();
    
    const event: TestEvent = {
      trialIndex,
      stimulusType,
      timestampNs,
      eventType,
    };
    
    this.testEvents.push(event);
    this.onStimulusChange(event);
  }
}
