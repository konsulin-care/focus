import { useState, type FC } from 'react';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/renderer/store';
import { constantTimeEquals } from '@/renderer/utils/constantTime';

export interface RecoveryModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

type RecoveryStep = 'validate-key' | 'reset-password';

/**
 * Modal component for password recovery using the direct recovery key path only.
 * Email recovery is temporarily disabled.
 */
export const RecoveryModal: FC<RecoveryModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('translation');
  const login = useAuthStore((state) => state.login);

  // Direct recovery state
  const [plaintextKey, setPlaintextKey] = useState('');
  const [validatedRecoveryKey, setValidatedRecoveryKey] = useState('');

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [step, setStep] = useState<RecoveryStep>('validate-key');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /** Resets all form fields to their initial empty state. */
  const resetState = () => {
    setPlaintextKey('');
    setValidatedRecoveryKey('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('validate-key');
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
        setValidatedRecoveryKey(plaintextKey);
        setStep('reset-password');
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

  // --- Password reset ---

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

    if (!constantTimeEquals(newPassword, confirmPassword)) {
      setError(t('admin.recovery.step2.error.passwordsMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electronAPI.authPerformRecovery(
        validatedRecoveryKey,
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

  // --- Password reset step ---
  if (step === 'reset-password') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-password-title"
      >
        <form
          onSubmit={(e) => {
            void handleResetPassword(e);
          }}
          className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6 space-y-4"
        >
          <h2 id="recovery-password-title" className="text-xl font-semibold text-gray-800">
            {t('admin.recovery.step2.title')}
          </h2>

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

  // --- Key validation step ---
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-key-title"
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
        <h2 id="recovery-key-title" className="text-xl font-semibold text-gray-800 mb-4">
          {t('admin.recovery.title')}
        </h2>

        <p className="text-sm text-gray-600 mb-4">{t('admin.recovery.direct.description')}</p>

        {/* Recovery key input */}
        <div>
          <label
            htmlFor="recovery-key-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('admin.recovery.direct.label')}
          </label>
          <input
            id="recovery-key-input"
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
            type="button"
            onClick={(e) => {
              void handleValidateDirectKey(e);
            }}
            className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-[#099B9E] font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? t('admin.recovery.direct.validating') : t('admin.recovery.direct.useKey')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryModal;
