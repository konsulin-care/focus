import { useState, useEffect, useCallback, useRef } from 'react';
import { TestPhase } from './useTestPhase';

interface UseFullscreenManagerReturn {
  isFullscreen: boolean;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
}

/** Manages fullscreen state and ESC-key exit during test phases. */
export function useFullscreenManager(
  _phase: TestPhase,
  onExitRequest: () => void
): UseFullscreenManagerReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const hasEnteredRef = useRef(false);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    const element = document.documentElement;
    elementRef.current = element;

    try {
      await element.requestFullscreen();
    } catch (error) {
      console.error('[useFullscreenManager] Failed to request fullscreen:', error);
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error('[useFullscreenManager] Failed to exit fullscreen:', error);
    }
  }, []);

  // Auto-enter fullscreen when phase becomes 'running'
  useEffect(() => {
    if (_phase === 'running' && !hasEnteredRef.current && !document.fullscreenElement) {
      hasEnteredRef.current = true;
      requestFullscreen();
    }
    if (_phase !== 'running') {
      hasEnteredRef.current = false;
    }
  }, [_phase, requestFullscreen]);

  // Handle fullscreen change events
  useEffect(() => {
    /** Handle fullscreen change events to update state. */
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;
      setIsFullscreen(!!fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle ESC key for graceful exit
  useEffect(() => {
    /** Handle Escape key to request fullscreen exit. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        onExitRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onExitRequest]);

  // Placeholder for mouse tracking removal
  useEffect(() => {
    // Mouse tracking removed - cursor hiding handled by parent component
    return () => {};
  }, []);

  return {
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
  };
}
