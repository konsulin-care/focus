import { useState, type FC } from 'react';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/renderer/store';

export interface AdminRegisterModalProps {
  isOpen: boolean;
  onComplete?: () => void;
}

/**
 * Modal component for first-time admin account registration.
 * Shown only when admin setup has not been completed (first run).
 * After successful registration the user sees a recovery key
 * that must be acknowledged before proceeding.
 */
export const AdminRegisterModal: FC<AdminRegisterModalProps> = ({ isOpen, onComplete }) => {
  const { t } = useTranslation('translation');
  const setSetupComplete = useAuthStore((state) => state.setSetupComplete);

  // Registration phase state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recovery key phase state
  const [recoveryKey, setRecoveryKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);

  const resetState = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsLoading(false);
    setRecoveryKey('');
    setHasSavedKey(false);
  };

  const handleClose = () => {
    resetState();
    onComplete?.();
  };

  // --- Registration phase ---

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password || !confirmPassword) {
      setError(t('admin.register.error.required'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('admin.register.error.invalidEmail'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('admin.register.error.passwordsMatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('admin.register.error.passwordLength'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electronAPI.authRegister(email, password);
      setRecoveryKey(result.recoveryKey);
      // Transition to recovery key phase
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('admin.register.error.registrationFailed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Recovery key phase ---

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
    } catch {
      // Clipboard API not available — ignore
    }
  };

  const handleContinue = async () => {
    // Auto-login after registration
    try {
      const result = await window.electronAPI.authLogin(password);
      useAuthStore.getState().login(result.sessionToken);
    } catch {
      // Login failed - user will need to use login modal
    }
    setSetupComplete(true);
    handleClose();
  };

  if (!isOpen) return null;

  // Recovery key display phase
  if (recoveryKey) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-key-title"
      >
        <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
          <h2 id="recovery-key-title" className="text-xl font-semibold text-gray-800 mb-4">
            {t('admin.register.title')}
          </h2>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
            <p className="text-sm text-amber-800 font-medium">{t('admin.register.saveWarning')}</p>
          </div>

          {/* Recovery key display */}
          <div className="mb-4">
            <label htmlFor="recovery-key" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.register.recoveryKey')}
            </label>
            <div className="flex gap-2">
              <code
                id="recovery-key"
                className="flex-1 block rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-gray-50 font-mono text-sm break-all"
              >
                {recoveryKey}
              </code>
              <button
                type="button"
                onClick={handleCopyKey}
                className="shrink-0 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors text-sm"
                aria-label={t('admin.register.copy')}
              >
                {t('admin.register.copy')}
              </button>
            </div>
          </div>

          {/* Acknowledgement checkbox */}
          <label className="flex items-start gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={hasSavedKey}
              onChange={(e) => setHasSavedKey(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">{t('admin.register.acknowledge')}</span>
          </label>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isLoading}
            >
              {t('admin.register.back')}
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-[#099B9E] font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={!hasSavedKey}
            >
              {t('admin.register.continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Registration form phase
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-title"
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
        <h2 id="register-title" className="text-xl font-semibold text-gray-800 mb-4">
          {t('admin.register.title')}
        </h2>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="register-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('admin.register.email')}
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
              placeholder={t('admin.register.emailPlaceholder')}
              disabled={isLoading}
              autoFocus
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('admin.register.password')}
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
              placeholder={t('admin.register.passwordPlaceholder')}
              disabled={isLoading}
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="register-confirm-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('admin.register.confirmPassword')}
            </label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
              placeholder={t('admin.register.confirmPasswordPlaceholder')}
              disabled={isLoading}
              required
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isLoading}
            >
              {t('button.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-[#099B9E] font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? t('admin.register.registering') : t('admin.register.register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRegisterModal;
