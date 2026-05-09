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

type RecoveryMethod = 'direct' | 'email';
type RecoveryStep = 'method' | 'password-reset';

/**
 * Modal component for password recovery with dual-path flow:
 *   Direct Recovery – Enter saved plaintext recovery key.
 *   Email Recovery  – System reads admin email from DB and sends webhook.
 * Both paths converge to the same password reset step.
 */
export const RecoveryModal: FC<RecoveryModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('translation');
  const login = useAuthStore((state) => state.login);

  // Method selection state
  const [method, setMethod] = useState<RecoveryMethod>('direct');

  // Direct recovery state
  const [plaintextKey, setPlaintextKey] = useState('');

  // Email recovery state
  const [emailSent, setEmailSent] = useState(false);

  // Email JSON payload state (for email recovery path)
  const [recoveryKeyJson, setRecoveryKeyJson] = useState('');

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [step, setStep] = useState<RecoveryStep>('method');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /** Resets all form fields to their initial empty state. */
  const resetState = () => {
    setMethod('direct');
    setPlaintextKey('');
    setEmailSent(false);
    setRecoveryKeyJson('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('method');
    setError('');
    setIsLoading(false);
  };

  /** Handles closing the recovery modal. */
  const handleClose = () => {
    resetState();
    onClose?.();
  };

  // --- Direct recovery: validate plaintext key ---

  const validatePlaintextKey = (value: string): boolean => {
    return /^[a-fA-F0-9]{64}$/.test(value);
  };

  /** Handles validation of the direct recovery key input. */
  const handleValidateDirectKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePlaintextKey(plaintextKey)) {
      setError(t('admin.recovery.invalidKey'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electronAPI.authValidateRecoveryKey(plaintextKey);
      if (result.valid) {
        setStep('password-reset');
      } else {
        setError(t('admin.recovery.invalidKey'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.recovery.direct.error.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Email recovery: request webhook ---

  const handleRequestEmail = async () => {
    setError('');
    setIsLoading(true);

    try {
      await window.electronAPI.authRequestRecovery();
      setEmailSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.recovery.email.error.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Password reset (shared by both paths) ---

  const parseRecoveryKey = (jsonStr: string): RecoveryKeyPayload => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return {};
    }
  };

  /** Handles password reset form submission after recovery key validation. */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

    // If email recovery path, validate JSON payload
    if (method === 'email' && recoveryKeyJson) {
      const parsed = parseRecoveryKey(recoveryKeyJson);
      if (!parsed.c || !parsed.iv || !parsed.tag) {
        setError(t('admin.recovery.step2.error.jsonParse'));
        return;
      }
    }

    setIsLoading(true);

    try {
      const result = await window.electronAPI.authPerformRecovery(
        recoveryKeyJson || '',
        newPassword
      );
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

  // --- Password reset step (shared by both paths) ---
  if (step === 'password-reset') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-password-title"
      >
        <form
          onSubmit={handleResetPassword}
          className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6 space-y-4"
        >
          <h2 id="recovery-password-title" className="text-xl font-semibold text-gray-800">
            {t('admin.recovery.step2.title')}
          </h2>

          {/* Success message for email path */}
          {method === 'email' && emailSent && (
            <p className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
              {t('admin.recovery.step2.successMessage')}
            </p>
          )}

          {/* Recovery key JSON input (email path only) */}
          {method === 'email' && (
            <>
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
                className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white font-mono text-sm focus:ring-primary focus:border-primary mb-4"
                placeholder={t('admin.recovery.step2.recoveryKeyPlaceholder')}
                disabled={isLoading}
                required
              />
            </>
          )}

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
            <p className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
              {error}
            </p>
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
    );
  }

  // --- Method selection step ---
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-method-title"
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
        <h2 id="recovery-method-title" className="text-xl font-semibold text-gray-800 mb-4">
          {t('admin.recovery.title')}
        </h2>

        {/* Method tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setMethod('direct');
              setError('');
            }}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              method === 'direct'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('admin.recovery.directTab')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod('email');
              setError('');
            }}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              method === 'email'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('admin.recovery.emailTab')}
          </button>
        </div>

        {/* Direct recovery form */}
        {method === 'direct' && (
          <form onSubmit={handleValidateDirectKey} className="space-y-4">
            <p className="text-sm text-gray-600">{t('admin.recovery.direct.description')}</p>

            <label
              htmlFor="recovery-key-direct"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('admin.recovery.direct.label')}
            </label>
            <input
              id="recovery-key-direct"
              type="text"
              value={plaintextKey}
              onChange={(e) => {
                setPlaintextKey(e.target.value);
                if (error) setError('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white font-mono text-sm focus:ring-primary focus:border-primary mb-1"
              placeholder={t('admin.recovery.direct.placeholder')}
              disabled={isLoading}
              required
              maxLength={64}
            />
            <p className="mt-1 text-xs text-gray-500">{t('admin.recovery.direct.hint')}</p>

            {error && (
              <p className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
                {error}
              </p>
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
                {isLoading
                  ? t('admin.recovery.direct.validating')
                  : t('admin.recovery.direct.useKey')}
              </button>
            </div>
          </form>
        )}

        {/* Email recovery form */}
        {method === 'email' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('admin.recovery.email.description')}</p>

            {emailSent ? (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-800">{t('admin.recovery.email.sent')}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequestEmail}
                className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-[#099B9E] font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? t('admin.recovery.email.sending') : t('admin.recovery.email.button')}
              </button>
            )}

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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecoveryModal;
