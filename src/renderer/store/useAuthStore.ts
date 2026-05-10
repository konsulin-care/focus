import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isSetupComplete: boolean;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;

  login: (sessionToken: string) => void;
  logout: () => void;
  setSetupComplete: (complete: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshStatus: () => Promise<void>;
  checkSetup: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isSetupComplete: false,
  sessionToken: null,
  isLoading: false,
  error: null,
  hasLoaded: false,

  login: (sessionToken) =>
    set({
      isAuthenticated: true,
      sessionToken,
      error: null,
    }),

  logout: () =>
    set({
      isAuthenticated: false,
      sessionToken: null,
      error: null,
    }),

  setSetupComplete: (complete) => set({ isSetupComplete: complete }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

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
}));
