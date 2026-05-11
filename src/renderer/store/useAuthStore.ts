import { create } from 'zustand';
import { constantTimeEquals } from '@/renderer/utils/constantTime';

interface AuthState {
  isAuthenticated: boolean;
  isSetupComplete: boolean;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;

  // Actions
  login: (sessionToken: string) => void;
  logout: () => void;
  setSetupComplete: (complete: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshStatus: () => Promise<void>;
  checkSetup: () => Promise<void>;
  registerAdmin: (email: string, password: string) => Promise<{ recoveryKey: string } | undefined>;
  loginWithPassword: (password: string) => Promise<{ sessionToken: string } | undefined>;
  validateRecoveryKey: (key: string) => Promise<boolean>;
  performRecovery: (
    key: string,
    newPassword: string
  ) => Promise<{ sessionToken: string } | undefined>;

  // Validation utilities
  validateEmail: (email: string) => boolean;
  passwordsMatch: (p1: string, p2: string) => boolean;
  copyRecoveryKey: (key: string) => Promise<void>;

  // Reset helpers
  resetRegistrationState: () => void;
  resetRecoveryState: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSetupComplete: false,
  sessionToken: null,
  isLoading: false,
  error: null,
  hasLoaded: false,

  login: (sessionToken) => {
    set({
      isAuthenticated: true,
      sessionToken,
      error: null,
    });
  },

  logout: () => {
    set({
      isAuthenticated: false,
      sessionToken: null,
      error: null,
    });
  },

  setSetupComplete: (complete) => {
    set({ isSetupComplete: complete });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  refreshStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.authStatus();
      set((prev) => ({
        ...prev,
        isAuthenticated: result.isAuthenticated,
        isSetupComplete: result.isSetupComplete,
        sessionToken: result.isAuthenticated ? prev.sessionToken : null,
        isLoading: false,
        hasLoaded: true,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to refresh auth status',
        isLoading: false,
        hasLoaded: true,
      });
    }
  },

  checkSetup: async () => {
    set({ isLoading: true, error: null });
    try {
      const isSetup = await window.electronAPI.authIsSetup();
      set({ isSetupComplete: isSetup, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to check setup status',
        isLoading: false,
      });
    }
  },

  // Validation helpers
  validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  passwordsMatch: (p1, p2) => constantTimeEquals(p1, p2),

  copyRecoveryKey: async (key) => {
    try {
      await navigator.clipboard.writeText(key);
    } catch {
      throw new Error('Failed to copy to clipboard');
    }
  },

  resetRegistrationState: () => {
    set({ error: null, isLoading: false });
  },
  resetRecoveryState: () => {
    set({ error: null, isLoading: false });
  },

  registerAdmin: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Client-side validation (mirrors main process checks)
      if (!get().validateEmail(email)) {
        throw new Error('Invalid email format');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      // Note: confirm password is validated by caller via passwordsMatch
      const result = await window.electronAPI.authRegister(email, password);
      set({ isSetupComplete: true, isLoading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Registration failed', isLoading: false });
      return undefined;
    }
  },

  loginWithPassword: async (password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.authLogin(password);
      get().login(result.sessionToken);
      set({ isLoading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login failed', isLoading: false });
      return undefined;
    }
  },

  validateRecoveryKey: async (key) => {
    set({ isLoading: true, error: null });
    try {
      // Format check first
      if (!/^[a-fA-F0-9]{64}$/.test(key)) {
        set({ error: 'Invalid recovery key format', isLoading: false });
        return false;
      }
      const result = await window.electronAPI.authValidateRecoveryKey(key);
      set({ isLoading: false });
      return result.valid;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Validation failed', isLoading: false });
      return false;
    }
  },

  performRecovery: async (key, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      const result = await window.electronAPI.authPerformRecovery(key, newPassword);
      set({ isAuthenticated: true, sessionToken: result.sessionToken, isLoading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Recovery failed', isLoading: false });
      return undefined;
    }
  },
}));
