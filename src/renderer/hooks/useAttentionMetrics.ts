import { useState, useCallback } from 'react';
import type { TestEvent } from '@/renderer/types/electronAPI';
import type { SubjectInfo, AttentionMetrics } from '@/renderer/types/trial';
import { calculateAttentionMetrics } from '@/renderer/utils/attention-metrics';

/**
 * Hook for calculating and managing attention metrics from test events
 * @param testEvents - Array of test events to process
 * @returns Object containing metrics, subject info, and calculation functions
 */
export function useAttentionMetrics(testEvents: TestEvent[]) {
  const [metrics, setMetrics] = useState<AttentionMetrics | null>(null);
  const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);

  const calculateMetrics = useCallback(
    (info: SubjectInfo) => {
      if (testEvents.length > 0) {
        setSubjectInfo(info);
        const result = calculateAttentionMetrics(testEvents, info);
        setMetrics(result);
        return result;
      }
      return null;
    },
    [testEvents]
  );

  return { metrics, subjectInfo, calculateMetrics, setMetrics };
}
