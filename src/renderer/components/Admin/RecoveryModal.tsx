import { useState, type FC } from 'react';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/renderer/store';

export interface RecoveryModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface RecoveryKeyPayload {
  c?: string;
  iv?: string;
  tag?: string;
}

/**
 * Modal component for password recovery via email.
 * Two-step flow:
 *   Step 1 – Enter email to request a recovery key.
 *   Step 2 – Paste the encrypted recovery key JSON and set a new password.
 */
export const RecoveryModal: FC<RecoveryModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('translation');
  const login = useAuthStore((state) => state.login);

  // Step 1 state
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 2 state
  const [recoveryKeyJson, setRecoveryKeyJson] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetState = () => {
    setEmail('');
    setStep(1);
    setError('');
    setIsLoading(false);
    setRecoveryKeyJson('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  // --- Step 1 ---

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('admin.recovery.step1.error.required'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('admin.recovery.step1.error.invalidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      await window.electronAPI.authRequestRecovery(email);
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.recovery.step1.error.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 2 ---

  const parseRecoveryKey = (jsonStr: string): RecoveryKeyPayload => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return {};
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate JSON payload
    const parsed = parseRecoveryKey(recoveryKeyJson);
    if (!parsed.c || !parsed.iv || !parsed.tag) {
      setError(t('admin.recovery.step2.error.jsonParse'));
      return;
    }

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      setError(t('admin.recovery.step2.error.required'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('admin.recovery.step2.error.newPasswordLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('admin.recovery.step2.error.passwordsMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electronAPI.authPerformRecovery(recoveryKeyJson, newPassword);
      login(result.sessionToken);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.recovery.step2.error.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // --- Step 1: Email input ---
  if (step === 1) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-step1-title"
      >
        <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
          <h2 id="recovery-step1-title" className="text-xl font-semibold text-gray-800 mb-4">
            {t('admin.recovery.step1.title')}
          </h2>

          <form onSubmit={handleSendRecovery} className="space-y-4">
            <p className="text-sm text-gray-600">{t('admin.recovery.step1.description')}</p>

            <div>
              <label
                htmlFor="recovery-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('admin.recovery.step1.email')}
              </label>
              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
                placeholder={t('admin.recovery.step1.emailPlaceholder')}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

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
                {isLoading ? t('admin.recovery.step1.sending') : t('admin.recovery.step1.send')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Step 2: Recovery key + new password ---
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-step2-title"
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
        <h2 id="recovery-step2-title" className="text-xl font-semibold text-gray-800 mb-4">
          {t('admin.recovery.step2.title')}
        </h2>

        {/* Success message */}
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <p className="text-sm text-green-800">{t('admin.recovery.step2.successMessage')}</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {/* Recovery key instructions */}
          <div>
            <label
              htmlFor="recovery-key-json"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('admin.recovery.step2.recoveryKey')}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {t('admin.recovery.step2.recoveryKeyHelp')}
            </p>
            <textarea
              id="recovery-key-json"
              value={recoveryKeyJson}
              onChange={(e) => {
                setRecoveryKeyJson(e.target.value);
                if (error) setError('');
              }}
              rows={4}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white font-mono text-sm focus:ring-primary focus:border-primary"
              placeholder={t('admin.recovery.step2.recoveryKeyPlaceholder')}
              disabled={isLoading}
              required
            />
          </div>

          {/* New password */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.recovery.step2.newPassword')}
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
              placeholder={t('admin.recovery.step2.newPasswordPlaceholder')}
              disabled={isLoading}
              required
            />
          </div>

          {/* Confirm new password */}
          <div>
            <label
              htmlFor="confirm-new-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('admin.recovery.step2.confirmNewPassword')}
            </label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
              placeholder={t('admin.recovery.step2.confirmNewPasswordPlaceholder')}
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

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
              {isLoading ? t('admin.recovery.step2.resetting') : t('admin.recovery.step2.reset')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecoveryModal;
