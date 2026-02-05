import { useState, useEffect, useCallback, useRef } from 'react';
import { TestPhase } from './useTestPhase';

const MOUSE_HIDE_RADIUS = 600;

interface UseFullscreenManagerReturn {
  isFullscreen: boolean;
  isCursorHidden: boolean;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
}

export function useFullscreenManager(
  _phase: TestPhase,
  onExitRequest: () => void
): UseFullscreenManagerReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCursorHidden, setIsCursorHidden] = useState(false);
  const mousePositionRef = useRef({ x: 0, y: 0 });
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
      if (event.code === 'Escape' && isFullscreen) {
        event.preventDefault();
        onExitRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, onExitRequest]);

  // Track mouse position and calculate cursor visibility
  useEffect(() => {
    if (!isFullscreen) {
      setIsCursorHidden(false);
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      setIsCursorHidden(distance > MOUSE_HIDE_RADIUS);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isFullscreen]);

  // Reset cursor visibility when exiting fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setIsCursorHidden(false);
    }
  }, [isFullscreen]);

  return {
    isFullscreen,
    isCursorHidden,
    requestFullscreen,
    exitFullscreen,
  };
}
