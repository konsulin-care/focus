import { useState, useCallback } from 'react';
import { TestEvent } from '@/renderer/types/electronAPI';
import { SubjectInfo, AttentionMetrics } from '@/renderer/types/trial';
import { calculateAttentionMetrics } from '@/renderer/utils/trial-metrics';

export function useAttentionMetrics(testEvents: TestEvent[]) {
  const [metrics, setMetrics] = useState<AttentionMetrics | null>(null);
  const [subjectInfo, setSubjectInfo] = useState<SubjectInfo | null>(null);

  const calculateMetrics = useCallback((info: SubjectInfo) => {
    if (testEvents.length > 0) {
      setSubjectInfo(info);
      const result = calculateAttentionMetrics(testEvents, info);
      setMetrics(result);
      return result;
    }
    return null;
  }, [testEvents]);

  return { metrics, subjectInfo, calculateMetrics, setMetrics };
}
