import { useState, useEffect, useCallback, useRef } from 'react';
import { TestPhase } from './useTestPhase';

const CLICK_COOLDOWN_MS = 100;

interface UseTestInputReturn {
  hasResponded: boolean;
  recordResponse: (response: boolean) => Promise<void>;
  resetResponse: () => void;
}

export function useTestInput(phase: TestPhase): UseTestInputReturn {
  const [hasResponded, setHasResponded] = useState(false);
  const lastClickTime = useRef<number>(0);

  const recordResponse = useCallback(async (response: boolean) => {
    try {
      await window.electronAPI.recordResponse(response);
      setHasResponded(true);
    } catch (error) {
      console.error('Failed to record response:', error);
    }
  }, []);

  const resetResponse = useCallback(() => {
    setHasResponded(false);
  }, []);

  useEffect(() => {
    if (phase !== 'running') {
      setHasResponded(false);
    }
  }, [phase]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (phase !== 'running') return;
      if (hasResponded) return;
      if (event.button !== 0) return;
      
      const now = Date.now();
      if (now - lastClickTime.current < CLICK_COOLDOWN_MS) {
        return;
      }
      lastClickTime.current = now;
      
      recordResponse(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (phase !== 'running') return;
      if (hasResponded) return;
      if (event.code === 'Space') {
        event.preventDefault();
        recordResponse(true);
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, hasResponded, recordResponse]);

  return { hasResponded, recordResponse, resetResponse };
}
