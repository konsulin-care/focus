import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { TestCompleteResult } from '@/renderer/types/electronAPI';

// Type definitions for the safe database API
type DatabaseQueryCommand = 
  | 'get-pending-uploads'
  | 'get-test-result'
  | 'delete-test-result'
  | 'get-upload-count'
  | 'get-all-test-results'
  | 'insert-test-result'
  | 'insert-test-result-with-consent'
  | 'update-test-result'
  | 'cleanup-expired-records'
  | 'get-expired-count';

// Test control API
type StimulusType = 'target' | 'non-target';

interface TestConfig {
  stimulusDurationMs: number;
  interstimulusIntervalMs: number;
  totalTrials: number;
  bufferMs: number;
}

interface TestEvent {
  trialIndex: number;
  stimulusType: StimulusType;
  timestampNs: string;
  eventType: 'stimulus-onset' | 'stimulus-offset' | 'response' | 'buffer-start';
  responseCorrect?: boolean;
  responseTimeMs?: number;     // Time from stimulus onset to response in milliseconds
  responseCount?: number;      // Number of responses this trial
  isAnticipatory?: boolean;    // True if response within 150ms of onset
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Timing API
  getHighPrecisionTime: () => ipcRenderer.invoke('get-high-precision-time'),
  getEventTimestamp: () => ipcRenderer.invoke('get-event-timestamp'),
  
  // Safe Database API - uses whitelist of predefined queries
  queryDatabase: (command: DatabaseQueryCommand, params?: unknown[]) => 
    ipcRenderer.invoke('query-database', command, params),
  
  // Test Control API - timing in main process for clinical precision
  startTest: () => ipcRenderer.invoke('start-test'),
  stopTest: () => ipcRenderer.invoke('stop-test'),
  recordResponse: (response: boolean) => ipcRenderer.invoke('record-response', response),
  onStimulusChange: (callback: (event: TestEvent) => void) => {
    /**
     * Listener for stimulus-change IPC events
     * @param _event - The IPC renderer event
     * @param data - The test event data
     */
    const listener = (_event: IpcRendererEvent, data: TestEvent) => callback(data);
    ipcRenderer.on('stimulus-change', listener);
    return () => {
      ipcRenderer.removeListener('stimulus-change', listener);
    };
  },
  onTestComplete: (callback: (result: TestCompleteResult) => void) => {
    /**
     * Listener for test-complete IPC events
     * @param _event - The IPC renderer event
     * @param data - The test complete result data
     */
    const listener = (_event: IpcRendererEvent, data: TestCompleteResult) => callback(data);
    ipcRenderer.on('test-complete', listener);
    return () => {
      ipcRenderer.removeListener('test-complete', listener);
    };
  },
  
  // Test Config API
  getTestConfig: () => ipcRenderer.invoke('get-test-config'),
  saveTestConfig: (config: TestConfig) => ipcRenderer.invoke('save-test-config', config),
  resetTestConfig: () => ipcRenderer.invoke('reset-test-config'),
  
  // GDPR Compliant Test Result API
  saveTestResultWithConsent: (
    testData: string,
    email: string,
    age: number,
    gender: 'Male' | 'Female',
    consentGiven: boolean,
    consentTimestamp: string
  ) => ipcRenderer.invoke('save-test-result-with-consent', testData, email, age, gender, consentGiven, consentTimestamp),

  // Session management API
  getAllSessions: () => ipcRenderer.invoke('get-all-sessions'),
  getSessionWithUser: (sessionId: number) => ipcRenderer.invoke('get-session-with-user', sessionId),
  getSessionTrials: (sessionId: number) => ipcRenderer.invoke('get-session-trials', sessionId),
  updateSessionStatus: (sessionId: number, status: 'pending' | 'uploaded' | 'failed') => ipcRenderer.invoke('update-session-status', sessionId, status),
  bulkDeleteSessions: (sessionIds: number[]) => ipcRenderer.invoke('bulk-delete-sessions', sessionIds),
});
