/**
 * F.O.C.U.S. Assessment - Test Engine
 * 
 * Test state machine with high-precision timing for stimulus presentation
 * and response capture.
 */

import { BrowserWindow } from 'electron';
import { 
  TestConfig, 
  TestEvent, 
  StimulusType, 
  TestEventType 
} from './types';
import { getTestConfig } from './test-config';
import { getHighPrecisionTime } from './timing';

// ===========================================
// Test State
// ===========================================

/**
 * Whether a test is currently running.
 */
export let testRunning = false;

/**
 * Array of recorded test events.
 */
export let testEvents: TestEvent[] = [];

/**
 * Pending responses for the current stimulus window.
 */
const pendingResponses: Array<{
  trialIndex: number;
  stimulusType: StimulusType;
  onsetTimestampNs: bigint;
  expectedResponse: boolean;
}> = [];

/**
 * Test start timestamp in nanoseconds.
 */
let testStartTimeNs: bigint = 0n;

/**
 * Current trial index (0-based).
 */
let currentTrialIndex = 0;

/**
 * Current stimulus type.
 */
let currentStimulusType: StimulusType = 'target';

/**
 * Reference to the main window for sending events.
 */
let mainWindow: BrowserWindow | null = null;

/**
 * Response count per trial (for detecting multiple responses).
 */
const responseCountPerTrial: Map<number, number> = new Map();

// ===========================================
// Window Reference
// ===========================================

/**
 * Set the main window reference for sending events to renderer.
 * 
 * @param window - The main BrowserWindow instance
 */
export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window;
}

/**
 * Get the main window reference.
 * 
 * @returns The main BrowserWindow or null
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

// ===========================================
// Event Emission
// ===========================================

/**
 * Helper function to emit stimulus change to renderer.
 * 
 * @param trialIndex - Trial index
 * @param stimulusType - Type of stimulus
 * @param eventType - Type of event
 */
function emitStimulusChange(
  trialIndex: number, 
  stimulusType: StimulusType, 
  eventType: TestEventType
): void {
  if (!mainWindow) return;
  
  const timestampNs = getHighPrecisionTime().toString();
  
  const event: TestEvent = {
    trialIndex,
    stimulusType,
    timestampNs,
    eventType,
  };
  
  testEvents.push(event);
  mainWindow.webContents.send('stimulus-change', event);
}

// ===========================================
// Test Sequence
// ===========================================

/**
 * Main stimulus sequence runner using precise timing with drift correction.
 */
function runStimulusSequence(): void {
  const config = getTestConfig();
  
  if (!testRunning || currentTrialIndex >= config.totalTrials) {
    completeTest();
    return;
  }
  
  // Check if this is the first trial - emit buffer-start event
  if (currentTrialIndex === 0) {
    emitStimulusChange(-1, 'target', 'buffer-start');
    
    // Schedule first stimulus after buffer period with drift correction
    const bufferEndTime = testStartTimeNs + BigInt(config.bufferMs) * 1_000_000n;
    const now = getHighPrecisionTime();
    const delayMs = Math.max(0, Number(bufferEndTime - now) / 1_000_000);
    
    setTimeout(() => {
      if (!testRunning) return;
      presentStimulus();
    }, delayMs);
    return;
  }
  
  // For subsequent trials, use drift-corrected scheduling with absolute timestamps
  const trialStartTime = testStartTimeNs + 
    BigInt(config.bufferMs) * 1_000_000n +
    BigInt(currentTrialIndex * (config.stimulusDurationMs + config.interstimulusIntervalMs)) * 1_000_000n;
  const now = getHighPrecisionTime();
  const delayMs = Math.max(0, Number(trialStartTime - now) / 1_000_000);
  
  setTimeout(() => {
    if (!testRunning) return;
    presentStimulus();
  }, delayMs);
}

/**
 * Present a single stimulus with drift-corrected timing.
 */
function presentStimulus(): void {
  const config = getTestConfig();
  
  if (!testRunning || currentTrialIndex >= config.totalTrials) {
    completeTest();
    return;
  }
  
  // Determine stimulus type (alternate)
  const isTarget = currentTrialIndex % 2 === 0;
  currentStimulusType = isTarget ? 'target' : 'non-target';
  const expectedResponse = isTarget;
  
  // Record stimulus onset
  emitStimulusChange(currentTrialIndex, currentStimulusType, 'stimulus-onset');
  
  // Store pending response for this trial
  pendingResponses.push({
    trialIndex: currentTrialIndex,
    stimulusType: currentStimulusType,
    onsetTimestampNs: getHighPrecisionTime(),
    expectedResponse,
  });
  
  // Calculate absolute timing targets using drift-corrected scheduling
  const now = Number(getHighPrecisionTime() - testStartTimeNs) / 1_000_000;
  const trialStartTime = config.bufferMs + currentTrialIndex * (config.stimulusDurationMs + config.interstimulusIntervalMs);
  const stimulusEndTime = trialStartTime + config.stimulusDurationMs;
  const nextTrialStartTime = stimulusEndTime + config.interstimulusIntervalMs;
  
  const offsetDelay = Math.max(0, stimulusEndTime - now);
  setTimeout(() => {
    if (!testRunning) return;
    
    const currentNow = Number(getHighPrecisionTime() - testStartTimeNs) / 1_000_000;
    emitStimulusChange(currentTrialIndex, currentStimulusType, 'stimulus-offset');
    
    const remainingDelay = Math.max(0, nextTrialStartTime - currentNow);
    setTimeout(() => {
      if (!testRunning) return;
      currentTrialIndex++;
      runStimulusSequence();
    }, remainingDelay);
  }, offsetDelay);
}

/**
 * Complete the test and send results to renderer.
 */
function completeTest(): void {
  testRunning = false;
  console.log(`Test completed. Total events: ${testEvents.length}`);
  
  const endTimeNs = getHighPrecisionTime();
  const elapsedTimeNs = endTimeNs - testStartTimeNs;
  
  if (mainWindow) {
    mainWindow.webContents.send('test-complete', { 
      events: testEvents, 
      startTimeNs: testStartTimeNs.toString(), 
      elapsedTimeNs: elapsedTimeNs.toString() 
    });
  }
}

// ===========================================
// Public API
// ===========================================

/**
 * Start the test sequence with high-precision timing.
 * 
 * @returns true if test started successfully
 */
export function startTest(): boolean {
  if (testRunning) {
    console.warn('Test already running, ignoring start request');
    return false;
  }
  
  console.log('Starting F.O.C.U.S. Assessment test sequence...');
  
  // Reset test state
  testRunning = true;
  testEvents = [];
  pendingResponses.length = 0;
  currentTrialIndex = 0;
  currentStimulusType = 'target';
  testStartTimeNs = getHighPrecisionTime();
  responseCountPerTrial.clear();
  
  // Start the stimulus sequence
  runStimulusSequence();
  
  return true;
}

/**
 * Stop the test prematurely.
 * 
 * @returns true if test was stopped
 */
export function stopTest(): boolean {
  if (!testRunning) {
    return false;
  }
  
  console.log('Stopping F.O.C.U.S. Assessment test sequence...');
  testRunning = false;
  completeTest();
  
  return true;
}

/**
 * Record a user response during the test.
 * 
 * @param responded - Whether the user responded
 */
export function recordResponse(responded: boolean): void {
  const responseTimestampNs = getHighPrecisionTime();
  
  // Allow responses up to 500ms after stimulus offset
  const validWindowMs = 500;
  const config = getTestConfig();
  
  // Find pending response that hasn't been answered yet
  const pendingIndex = pendingResponses.findIndex(pr => {
    const elapsedMs = Number(responseTimestampNs - pr.onsetTimestampNs) / 1_000_000;
    return elapsedMs < (config.stimulusDurationMs + validWindowMs);
  });
  
  if (pendingIndex === -1) {
    // No valid pending response - this is a false positive (commission error)
    const event: TestEvent = {
      trialIndex: -1,
      stimulusType: 'non-target',
      timestampNs: responseTimestampNs.toString(),
      eventType: 'response',
      responseCorrect: false,
      responseTimeMs: 0,
      responseCount: 1,
      isAnticipatory: false,
    };
    testEvents.push(event);
    return;
  }
  
  const pending = pendingResponses[pendingIndex];
  
  // Calculate response time from stimulus onset
  const responseTimeMs = Number(responseTimestampNs - pending.onsetTimestampNs) / 1_000_000;
  
  // Determine if response is anticipatory (<150ms from onset)
  const isAnticipatory = responseTimeMs < 150;
  
  // Increment response count for this trial
  const currentCount = responseCountPerTrial.get(pending.trialIndex) || 0;
  responseCountPerTrial.set(pending.trialIndex, currentCount + 1);
  
  // Determine if response was correct
  const isCorrect = pending.expectedResponse === responded;
  
  // Remove from pending responses
  pendingResponses.splice(pendingIndex, 1);
  
  // Record the response event with timing data
  const event: TestEvent = {
    trialIndex: pending.trialIndex,
    stimulusType: pending.stimulusType,
    timestampNs: responseTimestampNs.toString(),
    eventType: 'response',
    responseCorrect: isCorrect,
    responseTimeMs,
    responseCount: currentCount + 1,
    isAnticipatory,
  };
  
  testEvents.push(event);
  
  // Send to renderer for UI feedback
  if (mainWindow) {
    mainWindow.webContents.send('stimulus-change', event);
  }
}

/**
 * Get the current test events.
 * 
 * @returns Array of test events
 */
export function getTestEvents(): TestEvent[] {
  return testEvents;
}

/**
 * Get the number of recorded test events.
 * 
 * @returns Number of events
 */
export function getEventCount(): number {
  return testEvents.length;
}
