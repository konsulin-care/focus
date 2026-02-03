import { contextBridge, ipcRenderer } from 'electron';

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
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Timing API
  getHighPrecisionTime: () => ipcRenderer.invoke('get-high-precision-time'),
  getEventTimestamp: () => ipcRenderer.invoke('get-event-timestamp'),
  
  // Safe Database API - uses whitelist of predefined queries
  queryDatabase: (command: DatabaseQueryCommand, params?: any[]) => 
    ipcRenderer.invoke('query-database', command, params),
  
  // Test Control API - timing in main process for clinical precision
  startTest: () => ipcRenderer.invoke('start-test'),
  stopTest: () => ipcRenderer.invoke('stop-test'),
  recordResponse: (response: boolean) => ipcRenderer.invoke('record-response', response),
  onStimulusChange: (callback: (event: TestEvent) => void) => {
    const listener = (_event: any, data: TestEvent) => callback(data);
    ipcRenderer.on('stimulus-change', listener);
    return () => { ipcRenderer.removeListener('stimulus-change', listener); };
  },
  onTestComplete: (callback: (events: TestEvent[]) => void) => {
    const listener = (_event: any, data: TestEvent[]) => callback(data);
    ipcRenderer.on('test-complete', listener);
    return () => { ipcRenderer.removeListener('test-complete', listener); };
  },
  
  // Test Config API
  getTestConfig: () => ipcRenderer.invoke('get-test-config'),
  saveTestConfig: (config: TestConfig) => ipcRenderer.invoke('save-test-config', config),
  resetTestConfig: () => ipcRenderer.invoke('reset-test-config'),
  
  // GDPR Compliant Test Result API
  saveTestResultWithConsent: (
    testData: string,
    email: string,
    consentGiven: boolean,
    consentTimestamp: string
  ) => ipcRenderer.invoke('save-test-result-with-consent', testData, email, consentGiven, consentTimestamp),
});
