// Shared types for Electron API
// This file ensures consistent typing across all renderer components

export type StimulusType = 'target' | 'non-target';

export interface TestEvent {
  trialIndex: number;
  stimulusType: StimulusType;
  timestampNs: string;
  eventType: 'stimulus-onset' | 'stimulus-offset' | 'response' | 'buffer-start';
  responseCorrect?: boolean;
}

export interface ElectronAPI {
  // Timing API
  getHighPrecisionTime: () => Promise<string>;
  getEventTimestamp: () => Promise<string>;
  
  // Test Control API - timing in main process for clinical precision
  startTest: () => Promise<boolean>;
  stopTest: () => Promise<boolean>;
  recordResponse: (response: boolean) => Promise<void>;
  onStimulusChange: (callback: (event: TestEvent) => void) => () => void;
  onTestComplete: (callback: (events: TestEvent[]) => void) => () => void;
  
  // Database API - safe query whitelist pattern
  queryDatabase: (command: string, params?: any[]) => Promise<any>;
}

// Augment the Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
