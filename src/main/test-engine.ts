/**
 * F.O.C.U.S. Assessment - Test Engine
 * 
 * Test state machine with high-precision timing for stimulus presentation
 * and response capture.
 * 
 * Phase 3: Delegates response validation to ResponseTracker class.
 */

import { BrowserWindow } from 'electron';
import { 
  TestEvent, 
} from './types';
import { getTestConfig } from './test-config';
import { getHighPrecisionTime } from './timing';
import { TrialScheduler } from './trial-scheduler';
import { generateTrialSequence } from './trial-sequence';
import { ResponseTracker } from './response-tracker';

// ===========================================
// Window Reference
// ===========================================

/**
 * Reference to the main window for sending events.
 */
let mainWindow: BrowserWindow | null = null;

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
// Test Orchestrator
// ===========================================

/**
 * ResponseTracker instance for managing response validation.
 */
let responseTracker: ResponseTracker | null = null;

/**
 * TrialScheduler instance for managing test timing.
 */
let scheduler: TrialScheduler | null = null;

/**
 * Create a new TrialScheduler instance with configured callbacks.
 * 
 * @returns TrialScheduler instance
 */
function createScheduler(): TrialScheduler {
  const config = getTestConfig();
  
  // Create ResponseTracker for this test session
  responseTracker = new ResponseTracker(config);
  
  return new TrialScheduler(config, responseTracker, (event) => {
    // Emit stimulus change to renderer
    if (mainWindow) {
      mainWindow.webContents.send('stimulus-change', event);
    }
  }, (data) => {
    // Handle test completion
    if (mainWindow) {
      mainWindow.webContents.send('test-complete', data);
    }
  });
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
  if (scheduler?.isRunning()) {
    console.warn('Test already running, ignoring start request');
    return false;
  }
  
  console.log('Starting F.O.C.U.S. Assessment test sequence...');
  
  // Reset response tracker
  if (responseTracker) {
    responseTracker.clear();
  }
  
  // Generate randomized trial sequence with two-half ratio
  const config = getTestConfig();
  const sequence = generateTrialSequence(config.totalTrials);
  
  // Create and start scheduler
  scheduler = createScheduler();
  scheduler.start(sequence, getHighPrecisionTime());
  
  return true;
}

/**
 * Stop the test prematurely.
 * 
 * @returns true if test was stopped
 */
export function stopTest(): boolean {
  if (!scheduler?.isRunning()) {
    return false;
  }
  
  console.log('Stopping F.O.C.U.S. Assessment test sequence...');
  scheduler.stop();
  scheduler = null;
  responseTracker = null;
  
  return true;
}

/**
 * Record a user response during the test.
 * 
 * @param responded - Whether the user responded
 */
export function recordResponse(responded: boolean): void {
  if (!scheduler || !responseTracker) {
    return;
  }
  
  const responseTimestampNs = getHighPrecisionTime();
  const pendingResponses = responseTracker.getPendingResponses();
  
  if (pendingResponses.length === 0) {
    // No pending responses - this shouldn't happen normally
    // Check if this is a commission error (response outside any valid window)
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
    scheduler.addEvent(event);
    return;
  }
  
  // Use the most recent pending response (for the current trial)
  const pending = pendingResponses[pendingResponses.length - 1];
  
  const result = responseTracker.processResponse(
    responseTimestampNs,
    responded,
    pending.stimulusType,
    pending.trialIndex
  );
  
  if (!result) {
    // Duplicate response, already counted
    return;
  }
  
  if (result.isCommissionError) {
    // Commission error - response outside valid window
    const event: TestEvent = {
      trialIndex: -1,
      stimulusType: 'non-target',
      timestampNs: responseTimestampNs.toString(),
      eventType: 'response',
      responseCorrect: false,
      responseTimeMs: 0,
      responseCount: result.responseCount,
      isAnticipatory: false,
    };
    scheduler.addEvent(event);
  } else {
    // Valid response
    const event: TestEvent = {
      trialIndex: result.trialIndex,
      stimulusType: result.stimulusType,
      timestampNs: responseTimestampNs.toString(),
      eventType: 'response',
      responseCorrect: result.responseCorrect,
      responseTimeMs: result.responseTimeMs,
      responseCount: result.responseCount,
      isAnticipatory: result.isAnticipatory,
    };
    scheduler.addEvent(event);
    
    // Send to renderer for UI feedback
    if (mainWindow) {
      mainWindow.webContents.send('stimulus-change', event);
    }
  }
}

/**
 * Get the current test events.
 * 
 * @returns Array of test events
 */
export function getTestEvents(): TestEvent[] {
  return scheduler?.getEvents() || [];
}

/**
 * Get the number of recorded test events.
 * 
 * @returns Number of events
 */
export function getEventCount(): number {
  return scheduler?.getEvents().length || 0;
}
