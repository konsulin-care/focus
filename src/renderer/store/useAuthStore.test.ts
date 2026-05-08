/**
 * F.O.C.U.S. Assessment - Auth Store Tests
 *
 * Tests validate the Zustand auth store (useAuthStore) implemented in
 * `src/renderer/store/useAuthStore.ts`.
 *
 * Uses Vitest with mocked `window.electronAPI` for IPC calls.
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';

// ============================================================================
// Mocks
// ============================================================================

const mockAuthStatus = vi.fn();
const mockAuthIsSetup = vi.fn();

// ============================================================================
// Test helpers
// ============================================================================

/**
 * Build a window.electronAPI mock with the methods used by the auth store.
 */
function buildElectronAPIMock() {
  return {
    authStatus: mockAuthStatus,
    authIsSetup: mockAuthIsSetup,
  };
}

/**
 * Reset the Zustand store to its initial state.
 */
function resetStore() {
  useAuthStore.setState({
    isAuthenticated: false,
    isSetupComplete: true,
    sessionToken: null,
    isLoading: false,
    error: null,
  });
}

// ============================================================================
// Test suites
// ============================================================================

describe('Auth Store (useAuthStore)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStatus.mockReset();
    mockAuthIsSetup.mockReset();
    resetStore();
  });

  // --------------------------------------------------------------------------
  // Initial state
  // --------------------------------------------------------------------------

  describe('initial state', () => {
    it('should start with isAuthenticated=false', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should start with isSetupComplete=true', () => {
      expect(useAuthStore.getState().isSetupComplete).toBe(true);
    });

    it('should start with sessionToken=null', () => {
      expect(useAuthStore.getState().sessionToken).toBeNull();
    });

    it('should start with isLoading=false', () => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should start with error=null', () => {
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // login
  // --------------------------------------------------------------------------

  describe('login', () => {
    it('should set isAuthenticated=true', () => {
      const { login } = useAuthStore.getState();
      login('test-session-token');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should store the sessionToken', () => {
      const { login } = useAuthStore.getState();
      login('my-session-token');
      expect(useAuthStore.getState().sessionToken).toBe('my-session-token');
    });

    it('should clear any existing error', () => {
      const { login, setError } = useAuthStore.getState();
      setError('some error');
      login('new-token');
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should not change isSetupComplete', () => {
      const { login } = useAuthStore.getState();
      login('token');
      expect(useAuthStore.getState().isSetupComplete).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // logout
  // --------------------------------------------------------------------------

  describe('logout', () => {
    it('should set isAuthenticated=false', () => {
      const { login, logout } = useAuthStore.getState();
      login('some-token');
      logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should clear sessionToken', () => {
      const { login, logout } = useAuthStore.getState();
      login('some-token');
      logout();
      expect(useAuthStore.getState().sessionToken).toBeNull();
    });

    it('should clear any existing error', () => {
      const { login, logout, setError } = useAuthStore.getState();
      login('token');
      setError('old error');
      logout();
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should not change isSetupComplete', () => {
      const { login, logout } = useAuthStore.getState();
      login('token');
      logout();
      expect(useAuthStore.getState().isSetupComplete).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // setSetupComplete
  // --------------------------------------------------------------------------

  describe('setSetupComplete', () => {
    it('should set isSetupComplete to true', () => {
      const { setSetupComplete } = useAuthStore.getState();
      setSetupComplete(true);
      expect(useAuthStore.getState().isSetupComplete).toBe(true);
    });

    it('should set isSetupComplete to false', () => {
      const { setSetupComplete } = useAuthStore.getState();
      setSetupComplete(false);
      expect(useAuthStore.getState().isSetupComplete).toBe(false);
    });

    it('should not affect isAuthenticated', () => {
      const { setSetupComplete } = useAuthStore.getState();
      setSetupComplete(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // setLoading
  // --------------------------------------------------------------------------

  describe('setLoading', () => {
    it('should set isLoading to true', () => {
      const { setLoading } = useAuthStore.getState();
      setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should set isLoading to false', () => {
      const { setLoading } = useAuthStore.getState();
      setLoading(true);
      setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // setError
  // --------------------------------------------------------------------------

  describe('setError', () => {
    it('should set error to a string', () => {
      const { setError } = useAuthStore.getState();
      setError('something went wrong');
      expect(useAuthStore.getState().error).toBe('something went wrong');
    });

    it('should set error to null to clear', () => {
      const { setError } = useAuthStore.getState();
      setError('error');
      setError(null);
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // refreshStatus
  // --------------------------------------------------------------------------

  describe('refreshStatus', () => {
    beforeEach(() => {
      // Attach mock to window before each refreshStatus test
      // window doesn't exist in node environment, so we create it
      (globalThis as Record<string, unknown>).window = {
        electronAPI: buildElectronAPIMock(),
      };
    });

    it('should call window.electronAPI.authStatus()', async () => {
      mockAuthStatus.mockResolvedValue({
        isAuthenticated: true,
        isSetupComplete: true,
      });
      const { refreshStatus } = useAuthStore.getState();
      await refreshStatus();
      expect(mockAuthStatus).toHaveBeenCalledTimes(1);
    });

    it('should update isAuthenticated from authStatus result', async () => {
      mockAuthStatus.mockResolvedValue({
        isAuthenticated: true,
        isSetupComplete: false,
      });
      const { refreshStatus } = useAuthStore.getState();
      await refreshStatus();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should update isSetupComplete from authStatus result', async () => {
      mockAuthStatus.mockResolvedValue({
        isAuthenticated: false,
        isSetupComplete: true,
      });
      const { refreshStatus } = useAuthStore.getState();
      await refreshStatus();
      expect(useAuthStore.getState().isSetupComplete).toBe(true);
    });

    it('should set isLoading=true then false around the call', async () => {
      let resolvePromise: (value: unknown) => void;
      mockAuthStatus.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );
      const { refreshStatus } = useAuthStore.getState();
      const promise = refreshStatus();

      // isLoading should be true while the promise is pending
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolvePromise!({ isAuthenticated: true, isSetupComplete: true });
      await promise;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set error on authStatus rejection', async () => {
      mockAuthStatus.mockRejectedValue(new Error('Network error'));
      const { refreshStatus } = useAuthStore.getState();
      await refreshStatus();
      expect(useAuthStore.getState().error).toBe('Network error');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set a generic error for non-Error rejections', async () => {
      mockAuthStatus.mockRejectedValue('string error');
      const { refreshStatus } = useAuthStore.getState();
      await refreshStatus();
      expect(useAuthStore.getState().error).toBe('Failed to refresh auth status');
    });
  });

  // --------------------------------------------------------------------------
  // checkSetup
  // --------------------------------------------------------------------------

  describe('checkSetup', () => {
    beforeEach(() => {
      (globalThis as Record<string, unknown>).window = {
        electronAPI: buildElectronAPIMock(),
      };
    });

    it('should call window.electronAPI.authIsSetup()', async () => {
      mockAuthIsSetup.mockResolvedValue(true);
      const { checkSetup } = useAuthStore.getState();
      await checkSetup();
      expect(mockAuthIsSetup).toHaveBeenCalledTimes(1);
    });

    it('should set isSetupComplete=true when authIsSetup returns true', async () => {
      mockAuthIsSetup.mockResolvedValue(true);
      const { checkSetup } = useAuthStore.getState();
      await checkSetup();
      expect(useAuthStore.getState().isSetupComplete).toBe(true);
    });

    it('should set isSetupComplete=false when authIsSetup returns false', async () => {
      mockAuthIsSetup.mockResolvedValue(false);
      const { checkSetup } = useAuthStore.getState();
      await checkSetup();
      expect(useAuthStore.getState().isSetupComplete).toBe(false);
    });

    it('should set isLoading=true then false around the call', async () => {
      let resolvePromise: (value: unknown) => void;
      mockAuthIsSetup.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );
      const { checkSetup } = useAuthStore.getState();
      const promise = checkSetup();

      expect(useAuthStore.getState().isLoading).toBe(true);

      resolvePromise!(true);
      await promise;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set error on authIsSetup rejection', async () => {
      mockAuthIsSetup.mockRejectedValue(new Error('IPC failed'));
      const { checkSetup } = useAuthStore.getState();
      await checkSetup();
      expect(useAuthStore.getState().error).toBe('IPC failed');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });
});
