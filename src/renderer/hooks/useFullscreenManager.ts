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

  // Request fullscreen with cross-browser compatibility
  const requestFullscreen = useCallback(async () => {
    const element = document.documentElement;
    elementRef.current = element;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen.call(element);
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen.call(element);
      }
    } catch (error) {
      console.error('[useFullscreenManager] Failed to request fullscreen:', error);
    }
  }, []);

  // Exit fullscreen with cross-browser compatibility
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen.call(document);
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen.call(document);
      }
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
      const fullscreenElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(!!fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
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
