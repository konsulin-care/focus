// Shared types for Electron API
// This file ensures consistent typing across all renderer components

export type StimulusType = 'target' | 'non-target';
import { AttentionMetrics } from './trial';

export interface TestConfig {
  stimulusDurationMs: number;
  interstimulusIntervalMs: number;
  totalTrials: number;
  bufferMs: number;
}

export interface TestEvent {
  trialIndex: number;
  stimulusType: StimulusType;
  timestampNs: string;
  eventType: 'stimulus-onset' | 'stimulus-offset' | 'response' | 'buffer-start';
  responseCorrect?: boolean;
  
  // Response tracking (for response events)
  responseTimeMs?: number;     // Time from stimulus onset to response in milliseconds
  responseCount?: number;      // Number of responses this trial
  isAnticipatory?: boolean;    // True if response within 150ms of onset
}

export interface TestCompleteResult {
  events: TestEvent[];
  startTimeNs: string;
  elapsedTimeNs: string;
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
  onTestComplete: (callback: (result: TestCompleteResult) => void) => () => void;
  
   // Database API - safe query whitelist pattern
   queryDatabase: (command: string, params?: unknown[]) => Promise<unknown>;
   
   // Test Result API - GDPR compliant email capture
   saveTestResultWithConsent: (
     testData: string,
     email: string,
     age: number,
     gender: 'Male' | 'Female',
     consentGiven: boolean,
     consentTimestamp: string,
     metrics: AttentionMetrics
   ) => Promise<void>;
  
  // Test Config API
  getTestConfig: () => Promise<TestConfig>;
  saveTestConfig: (config: TestConfig) => Promise<void>;
  resetTestConfig: () => Promise<void>;
  
  // Data Management
  getAllSessions: () => Promise<SessionWithUser[]>;
  getSessionWithUser: (sessionId: number) => Promise<SessionWithUser | undefined>;
  getSessionTrials: (sessionId: number) => Promise<TrialData[]>;
  updateSessionStatus: (sessionId: number, status: 'pending' | 'uploaded' | 'failed') => Promise<void>;
  bulkDeleteSessions: (sessionIds: number[]) => Promise<{ deleted: number }>;
}

// Augment the Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export interface SessionWithUser {
  id: number;
  test_date: string;
  acs_score: number;
  acs_interpretation: string;
  mean_response_time_ms: number;
  response_time_variability: number;
  commission_errors: number;
  omission_errors: number;
  hits: number;
  d_prime: number;
  validity: string;
  validity_reason?: string;
  total_trials: number;
  test_config: string;
  upload_status: string;
  uploaded_at?: string | null;
  consent_given: boolean;
  consent_timestamp?: string | null;
  email: string;
  age: number;
  gender: 'Male' | 'Female';
  is_generic: number;
}

export interface TrialData {
  id: number;
  test_session_id: number;
  trial_index: number;
  stimulus_type: 'target' | 'non-target';
  outcome: 'hit' | 'omission' | 'commission' | 'correct-rejection' | null;
  response_correct: boolean | null;
  response_time_ms: number | null;
  is_anticipatory: boolean;
  is_multiple_response: boolean;
  follows_commission: boolean;
}
