import { useState, useEffect } from 'react';
import { TestEvent, TestCompleteResult } from '@/renderer/types/electronAPI';

interface UseTestEventsReturn {
  testEvents: TestEvent[];
  lastEvent: TestEvent | null;
  elapsedTimeMs: number;
  testDataJson: string;
  trialCount: number;
}

/**
 * Hook for managing test events and test state
 * @param onComplete - Callback when test completes
 * @param resetResponse - Callback to reset response state
 * @returns Object containing test events, last event, elapsed time, test data JSON, and trial count
 */
export function useTestEvents(
  onComplete: (data: TestCompleteResult) => void,
  resetResponse: () => void
): UseTestEventsReturn {
  const [testEvents, setTestEvents] = useState<TestEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<TestEvent | null>(null);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [testDataJson, setTestDataJson] = useState<string>('');
  const [trialCount, setTrialCount] = useState(0);

  useEffect(() => {
    const unsubscribeStimulus = window.electronAPI.onStimulusChange((event) => {
      setLastEvent(event);
      setTestEvents(prev => [...prev, event]);
      
      if (event.eventType === 'stimulus-onset') {
        setTrialCount(event.trialIndex + 1);
        resetResponse(); // Reset response state for new trial
      } else if (event.eventType === 'buffer-start') {
        resetResponse(); // Reset for buffer period
      }
    });

    const unsubscribeComplete = window.electronAPI.onTestComplete((data: TestCompleteResult) => {
      console.log('Test complete, received', data.events.length, 'events');
      setTestEvents(data.events);
      setElapsedTimeMs(Number(data.elapsedTimeNs) / 1_000_000);
      setTestDataJson(JSON.stringify(data));
      onComplete(data);
    });

    return () => {
      unsubscribeStimulus();
      unsubscribeComplete();
    };
  }, [onComplete, resetResponse]);

  return { testEvents, lastEvent, elapsedTimeMs, testDataJson, trialCount };
}
