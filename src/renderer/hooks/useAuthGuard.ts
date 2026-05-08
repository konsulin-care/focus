import { useState, useEffect } from 'react';
import { useAuthStore } from '@/renderer/store';

export type AuthModalStatus = 'loading' | 'register' | 'login' | 'authenticated';

interface UseAuthGuardReturn {
  authModalStatus: AuthModalStatus;
  showRecovery: boolean;
  handleLoginSuccess: () => void;
  handleRegisterSuccess: () => void;
  handleForgotPassword: () => void;
  handleRecoveryClose: () => void;
}

/**
 * Hook for managing authentication guard state in protected pages.
 * Implements a state machine that ensures only one modal is shown at a time,
 * preventing race conditions between registration and login modals.
 */
export function useAuthGuard(): UseAuthGuardReturn {
  const isSetupComplete = useAuthStore((state) => state.isSetupComplete);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasLoaded = useAuthStore((state) => state.hasLoaded);

  const [authModalStatus, setAuthModalStatus] = useState<AuthModalStatus>('loading');
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    // Only update modal state after initial load completes
    // This prevents race conditions where both modals would show
    if (!hasLoaded) {
      return;
    }

    if (!isSetupComplete && !isAuthenticated) {
      setAuthModalStatus('register');
    } else if (isSetupComplete && !isAuthenticated) {
      setAuthModalStatus('login');
    } else {
      setAuthModalStatus('authenticated');
    }
  }, [isSetupComplete, isAuthenticated, hasLoaded]);

  return {
    authModalStatus,
    showRecovery,
    handleLoginSuccess: () => setAuthModalStatus('authenticated'),
    handleRegisterSuccess: () => setAuthModalStatus('authenticated'),
    handleForgotPassword: () => setShowRecovery(true),
    handleRecoveryClose: () => setShowRecovery(false),
  };
}
