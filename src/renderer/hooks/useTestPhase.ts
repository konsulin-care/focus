import { useState, useEffect, useCallback } from 'react';
import type { TestConfig } from '@/renderer/utils';

export type TestPhase =
  | 'countdown'
  | 'buffer'
  | 'running'
  | 'completed'
  | 'email-capture'
  | 'error';

interface UseTestPhaseReturn {
  phase: TestPhase;
  setPhase: (phase: TestPhase) => void;
  countdown: number;
  testConfig: TestConfig;
  startTestSequence: () => Promise<void>;
}

/**
 * Hook for managing test phase state and sequence
 * @returns Object containing current phase, phase setter, countdown, test config, and test sequence starter
 */
export function useTestPhase(): UseTestPhaseReturn {
  const [phase, setPhase] = useState<TestPhase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    stimulusDurationMs: 100,
    interstimulusIntervalMs: 2000,
    totalTrials: 648,
    bufferMs: 500,
  });

  // Fetch test config on mount
  useEffect(() => {
    window.electronAPI
      .getTestConfig()
      .then(setTestConfig)
      .catch((err) => console.error('[useTestPhase] Failed to fetch config:', err));
  }, []);

  // Start test sequence
  const startTestSequence = useCallback(async () => {
    try {
      const success = await window.electronAPI.startTest();
      if (success) {
        setPhase('running');
      }
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Only start when countdown transitions from 1 to 0
      // The else if guard prevents multiple calls if effect re-runs before state update
      startTestSequence().catch((error) => {
        console.error('[useTestPhase] Failed to start test sequence:', error);
        setPhase('error');
      });
    }
  }, [countdown, phase, startTestSequence]);

  return { phase, setPhase, countdown, testConfig, startTestSequence };
}
