import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeoutMs: number;
  onIdle: () => void;
}

/**
 * Hook that logs out the user after a period of inactivity.
 * Resets the timer on mousemove and keydown events.
 */
export function useIdleTimer({ timeoutMs, onIdle }: UseIdleTimerOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(async () => {
      try {
        await window.electronAPI.authLogout();
      } catch (err) {
        console.error('Failed to logout on idle:', err);
      }
      onIdle();
    }, timeoutMs);
  }, [timeoutMs, onIdle]);

  useEffect(() => {
    resetTimer();

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [resetTimer]);
}
