import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation, useAuthStore } from '@/renderer/store';
import { useAuthGuard, useIdleTimer } from '@/renderer/hooks';
import {
  AdminLoginModal,
  AdminRegisterModal,
  ChangePasswordModal,
  RecoveryModal,
  RemoveAdminModal,
} from '@/renderer/components/Admin';
import type { TestConfig } from '@/renderer/types/electronAPI';

/** Timing settings section – extracted to reduce JSX nesting depth. */
const TimingSettings = ({
  config,
  displayTotalTrials,
  showNormalizationWarning,
  onStimulusDurationChange,
  onInterstimulusIntervalChange,
  onTotalTrialsChange,
  onTotalTrialsFocus,
  onTotalTrialsBlur,
  onBufferChange,
  onSave,
  onReset,
  status,
  statusIsError,
}: {
  config: TestConfig;
  displayTotalTrials: string | number;
  showNormalizationWarning: boolean;
  onStimulusDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInterstimulusIntervalChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTotalTrialsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTotalTrialsFocus: () => void;
  onTotalTrialsBlur: () => void;
  onBufferChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onReset: () => void;
  status: string;
  statusIsError: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">{t('settings.timing.title')}</h2>
      <p className="text-gray-600 mb-4">{t('settings.timing.configDescription')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="stimulus-duration"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('settings.timing.stimulusDuration')}
          </label>
          <input
            id="stimulus-duration"
            type="number"
            value={config.stimulusDurationMs}
            onChange={onStimulusDurationChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            min="10"
            max="1000"
          />
        </div>

        <div>
          <label
            htmlFor="interstimulus-interval"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('settings.timing.interstimulusInterval')}
          </label>
          <input
            id="interstimulus-interval"
            type="number"
            value={config.interstimulusIntervalMs}
            onChange={onInterstimulusIntervalChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            min="100"
            max="5000"
          />
        </div>

        <div>
          <label htmlFor="total-trials" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings.timing.totalTrials')}
          </label>
          <input
            id="total-trials"
            type="number"
            value={displayTotalTrials}
            onChange={onTotalTrialsChange}
            onFocus={onTotalTrialsFocus}
            onBlur={onTotalTrialsBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('settings.timing.totalTrialsDescription')}
          </p>
          {showNormalizationWarning && (
            <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <title>{t('settings.timing.warningIcon') || 'Warning'}</title>
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {t('settings.timing.oddValuesRounded', { value: displayTotalTrials })}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="buffer-time" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings.timing.bufferTime')}
          </label>
          <input
            id="buffer-time"
            type="number"
            value={config.bufferMs}
            onChange={onBufferChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            min="0"
            max="2000"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            void onSave();
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#099B9E] transition-colors cursor-pointer"
        >
          {t('button.saveSettings')}
        </button>
        <button
          type="button"
          onClick={() => {
            void onReset();
          }}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
        >
          {t('button.resetDefaults')}
        </button>
      </div>

      {status && (
        <p className={`mt-3 text-sm ${statusIsError ? 'text-red-600' : 'text-green-600'}`}>
          {status}
        </p>
      )}
    </div>
  );
};

/** Admin account actions card – extracted to reduce JSX nesting depth. */
const AdminAccountActions = ({
  setShowChangePassword,
  setShowRemoveAdmin,
}: {
  setShowChangePassword: (show: boolean) => void;
  setShowRemoveAdmin: (show: boolean) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h3 className="text-lg font-medium text-gray-800">{t('settings.account')}</h3>

      <div className="w-1/2 flex flex-col gap-3 mt-3">
        <button
          type="button"
          onClick={() => {
            setShowChangePassword(true);
          }}
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
        >
          {t('settings.changePassword')}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowRemoveAdmin(true);
          }}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
        >
          {t('settings.removeAdmin')}
        </button>
      </div>

      <p className="text-sm text-gray-600 mt-2">{t('settings.removeAdminDescription')}</p>
    </div>
  );
};

/**
 * Settings page component for configuring test parameters
 * Allows users to adjust stimulus duration, inter-stimulus interval, total trials, and buffer time
 * @returns JSX element for the settings page
 */
export default function Settings() {
  const { t } = useTranslation();
  const { setPage, lastVisitedPublicPage } = useNavigation();
  const [config, setConfig] = useState<TestConfig>({
    stimulusDurationMs: 100,
    interstimulusIntervalMs: 2000,
    totalTrials: 648,
    bufferMs: 500,
  });
  const [status, setStatus] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [isTotalTrialsFocused, setIsTotalTrialsFocused] = useState(false);
  const [editingValue, setEditingValue] = useState<string>('');
  const [totalTrialsRaw, setTotalTrialsRaw] = useState<number>(648);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showRemoveAdmin, setShowRemoveAdmin] = useState(false);

  // Auth modal state - using state machine to prevent race conditions
  const {
    authModalStatus,
    showRecovery,
    handleLoginSuccess,
    handleRegisterSuccess,
    handleForgotPassword,
    handleRecoveryClose,
  } = useAuthGuard();

  // Idle timer (10 min)
  useIdleTimer({
    timeoutMs: 10 * 60 * 1000,
    onIdle: () => {
      useAuthStore.getState().logout();
      setStatus('Session expired due to inactivity');
      setStatusIsError(true);
      setTimeout(() => {
        setStatus('');
        setStatusIsError(false);
      }, 5000);
    },
  });

  // Refresh auth status on mount
  useEffect(() => {
    useAuthStore.getState().refreshStatus();
  }, []);

  // Get auth state from store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSetupComplete = useAuthStore((state) => state.isSetupComplete);

  // Show raw value when focused and editing, otherwise show normalized
  const displayTotalTrials =
    isTotalTrialsFocused && editingValue !== ''
      ? editingValue
      : totalTrialsRaw % 2 === 0
        ? totalTrialsRaw
        : totalTrialsRaw + 1;

  // Show warning when normalization would occur AND field is not focused
  const showNormalizationWarning =
    !isTotalTrialsFocused && totalTrialsRaw >= 2 && totalTrialsRaw % 2 !== 0;

  // Load test config only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    window.electronAPI
      .getTestConfig()
      .then((cfg) => {
        setConfig(cfg);
        setTotalTrialsRaw(cfg.totalTrials);
      })
      .catch(() => {
        setStatus(t('status.loadFailed'));
        setStatusIsError(true);
      });
  }, [t, isAuthenticated]);

  /**
   * Handles saving of settings configuration
   * Normalizes totalTrials to be even before saving
   */
  const handleSave = async () => {
    try {
      // Normalize totalTrials on save
      const normalized = totalTrialsRaw % 2 === 0 ? totalTrialsRaw : totalTrialsRaw + 1;
      const configToSave = { ...config, totalTrials: normalized };
      await window.electronAPI.saveTestConfig(configToSave);
      // Refetch from database to ensure UI matches persisted state
      const updatedConfig = await window.electronAPI.getTestConfig();
      setConfig(updatedConfig);
      setTotalTrialsRaw(updatedConfig.totalTrials);
      setStatus(t('status.saveSuccess'));
      setStatusIsError(false);
      setTimeout(() => {
        setStatus('');
        setStatusIsError(false);
      }, 3000);
    } catch {
      setStatus(t('status.saveFailed'));
      setStatusIsError(true);
      setTimeout(() => {
        setStatus('');
        setStatusIsError(false);
      }, 3000);
    }
  };

  /**
   * Handles resetting of test configuration to default values
   * Fetches default config from electron API and updates state
   */
  const handleReset = async () => {
    try {
      await window.electronAPI.resetTestConfig();
      const newConfig = await window.electronAPI.getTestConfig();
      setConfig(newConfig);
      setTotalTrialsRaw(newConfig.totalTrials);
      setStatus(t('status.resetSuccess'));
      setStatusIsError(false);
      setTimeout(() => {
        setStatus('');
        setStatusIsError(false);
      }, 3000);
    } catch {
      setStatus(t('status.resetFailed'));
      setStatusIsError(true);
      setTimeout(() => {
        setStatus('');
        setStatusIsError(false);
      }, 3000);
    }
  };

  /**
   * Handles removing the admin account
   * Requires password confirmation and optional data wipe
   */
  const handleRemoveAdmin = async (password: string, wipeData: boolean) => {
    await window.electronAPI.authDeleteAdmin(password, wipeData);
    // Logout and refresh status
    useAuthStore.getState().logout();
    setStatus(t('settings.removeAdminSuccess'));
    setStatusIsError(false);
    setTimeout(() => {
      setStatus('');
      setStatusIsError(false);
      useAuthStore.getState().refreshStatus();
    }, 3000);
  };

  /**
   * Handles changes to configuration fields
   * For totalTrials, stores raw value while typing and normalizes on blur
   * @param field - Configuration field to update
   * @param value - New value for the field
   */
  const handleChange = (field: keyof TestConfig, value: number) => {
    if (field === 'totalTrials') {
      // Store raw value while typing, normalize on blur
      setTotalTrialsRaw(Math.max(2, value));
      setConfig((prev) => ({ ...prev, [field]: Math.max(2, value) }));
    } else {
      setConfig((prev) => ({ ...prev, [field]: value }));
    }
  };

  /**
   * Handles changes to the total trials input field
   * Updates editing value and config in real-time while ensuring minimum value of 2
   * @param e - Change event from the input element
   */
  const handleTotalTrialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditingValue(val);
    const num = parseInt(val, 10) || 2;
    const constrainedNum = Math.max(2, num);
    setTotalTrialsRaw(constrainedNum);
    setConfig((prev) => ({ ...prev, totalTrials: constrainedNum }));
  };

  const handleTotalTrialsBlur = useCallback(() => {
    setIsTotalTrialsFocused(false);

    let value = totalTrialsRaw;
    if (!Number.isInteger(value) || value < 2) {
      value = 2;
    } else if (value % 2 !== 0) {
      value = value + 1;
    }

    setEditingValue('');
    setConfig((prev) => ({ ...prev, totalTrials: value }));
  }, [totalTrialsRaw]);

  /**
   * Handles focus event on the total trials input field
   * Sets focus state and prepares editing value for input
   */
  const handleTotalTrialsFocus = () => {
    setIsTotalTrialsFocused(true);
    setEditingValue(String(config.totalTrials));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">{t('settings.title')}</h1>

      {/* Auth Modals */}
      <AdminRegisterModal
        isOpen={authModalStatus === 'register'}
        onComplete={handleRegisterSuccess}
      />
      <AdminLoginModal
        isOpen={authModalStatus === 'login'}
        mandatory
        onSuccess={handleLoginSuccess}
        onBack={() => setPage(lastVisitedPublicPage || 'home')}
        onForgotPassword={handleForgotPassword}
      />
      <RecoveryModal isOpen={showRecovery} onClose={handleRecoveryClose} />
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      {/* Settings content — shown only when authenticated */}
      {isAuthenticated && isSetupComplete ? (
        <div className="space-y-6">
          <TimingSettings
            config={config}
            displayTotalTrials={displayTotalTrials}
            showNormalizationWarning={showNormalizationWarning}
            onStimulusDurationChange={(e) =>
              handleChange('stimulusDurationMs', parseInt(e.target.value, 10) || 0)
            }
            onInterstimulusIntervalChange={(e) =>
              handleChange('interstimulusIntervalMs', parseInt(e.target.value, 10) || 0)
            }
            onTotalTrialsChange={handleTotalTrialsChange}
            onTotalTrialsFocus={handleTotalTrialsFocus}
            onTotalTrialsBlur={handleTotalTrialsBlur}
            onBufferChange={(e) => handleChange('bufferMs', parseInt(e.target.value, 10) || 0)}
            onSave={handleSave}
            onReset={handleReset}
            status={status}
            statusIsError={statusIsError}
          />
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              setPage('home');
            }}
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
          >
            {t('button.backToHome')}
          </button>
          <AdminAccountActions
            setShowChangePassword={setShowChangePassword}
            setShowRemoveAdmin={setShowRemoveAdmin}
          />
        </div>
      ) : null}

      <RemoveAdminModal
        isOpen={showRemoveAdmin}
        onClose={() => setShowRemoveAdmin(false)}
        onConfirm={handleRemoveAdmin}
      />
    </div>
  );
}
