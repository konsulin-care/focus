import { useState, useEffect, useCallback } from 'react';
import { TestPhase } from './useTestPhase';

interface UseFullscreenManagerReturn {
  isFullscreen: boolean;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
}

export function useFullscreenManager(
  _phase: TestPhase,
  onExitRequest: () => void
): UseFullscreenManagerReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const hasEnteredRef = useRef(false);

  // Auto-enter fullscreen when phase becomes 'running'
  useEffect(() => {
    if (_phase === 'running' && !hasEnteredRef.current && !document.fullscreenElement) {
      hasEnteredRef.current = true;
      requestFullscreen();
    }
    if (_phase !== 'running') {
      hasEnteredRef.current = false;
    }
  }, [_phase]);

  // Request fullscreen with cross-browser compatibility
  const requestFullscreen = useCallback(async () => {
    const element = document.documentElement;
    elementRef.current = element;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen!();
      } else if ((element as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
        await (element as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen!();
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
      } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen!();
      } else if ((document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
        await (document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen!();
      }
    } catch (error) {
      console.error('[useFullscreenManager] Failed to exit fullscreen:', error);
    }
  }, []);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as Document & { msFullscreenElement?: Element }).msFullscreenElement;
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

import { useRef } from 'react';
