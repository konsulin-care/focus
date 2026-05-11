import { useState, type FC, type FormEvent } from 'react';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/renderer/store';

export interface RecoveryModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

type RecoveryStep = 'validate-key' | 'reset-password';

/**
 * Modal wrapper for password recovery using the direct recovery key path only.
 * Email recovery is temporarily disabled.
 */
export const RecoveryModal: FC<RecoveryModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('translation');
  const store = useAuthStore();
  const error = store.error || '';
  const isLoading = store.isLoading;

  // Direct recovery state
  const [plaintextKey, setPlaintextKey] = useState('');
  const [validatedRecoveryKey, setValidatedRecoveryKey] = useState('');

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [step, setStep] = useState<RecoveryStep>('validate-key');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      {step === 'reset-password' ? (
        <PasswordResetForm
          t={t}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          error={error}
          isLoading={isLoading}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onErrorSet={() => store.setError(null)}
          onSubmit={handlePasswordSubmit}
          onBack={handleBackToKeyEntry}
        />
      ) : (
        <KeyValidationForm
          t={t}
          plaintextKey={plaintextKey}
          error={error}
          isLoading={isLoading}
          onKeyChange={setPlaintextKey}
          onErrorSet={() => store.setError(null)}
          onValidate={handleValidateDirectKey}
          onClose={handleClose}
        />
      )}
    </div>
  );

  /** Resets form and closes modal. */
  function handleClose() {
    setPlaintextKey('');
    setValidatedRecoveryKey('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('validate-key');
    store.resetRecoveryState();
    onClose?.();
  }

  /** Returns to key entry from password reset step. */
  function handleBackToKeyEntry() {
    setStep('validate-key');
    store.setError(null);
  }

  /** Handles validation of the direct recovery key input. */
  async function handleValidateDirectKey(e: FormEvent) {
    e.preventDefault();
    store.setError(null);
    const isValid = await store.validateRecoveryKey(plaintextKey);
    if (isValid) {
      setValidatedRecoveryKey(plaintextKey);
      setStep('reset-password');
    }
    // else store.error is set
  }

  /** Handles password reset submission after recovery key validation. */
  async function handlePasswordSubmit() {
    if (!store.passwordsMatch(newPassword, confirmPassword)) {
      store.setError(t('admin.recovery.step2.error.passwordsMatch'));
      return;
    }
    if (newPassword.length < 8) {
      store.setError(t('admin.recovery.step2.error.newPasswordLength'));
      return;
    }
    const result = await store.performRecovery(validatedRecoveryKey, newPassword);
    if (result) {
      onClose?.();
    }
    // on failure, store.error already set
  }
};

/**
 * Key validation form component (step 1 of recovery).
 */
interface KeyValidationFormProps {
  t: (key: string) => string;
  plaintextKey: string;
  error: string;
  isLoading: boolean;
  onKeyChange: (key: string) => void;
  onErrorSet: () => void;
  onValidate: (e: FormEvent) => void;
  onClose: () => void;
}

const KeyValidationForm: FC<KeyValidationFormProps> = ({
  t,
  plaintextKey,
  error,
  isLoading,
  onKeyChange,
  onErrorSet,
  onValidate,
  onClose,
}) => {
  /** Handles backdrop click to close the modal. */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /** Handles keydown events (Escape key) to close the modal. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
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
            onKeyChange(e.target.value);
            if (error) onErrorSet();
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
        <p className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400"
          disabled={isLoading}
        >
          {t('button.cancel')}
        </button>
        <button
          type="button"
          onClick={onValidate}
          className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-[#099B9E] font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? t('admin.recovery.direct.validating') : t('admin.recovery.direct.useKey')}
        </button>
      </div>
    </div>
  );
};

/**
 * Password reset form component (step 2 of recovery).
 */
interface PasswordResetFormProps {
  t: (key: string) => string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  isLoading: boolean;
  onNewPasswordChange: (pwd: string) => void;
  onConfirmPasswordChange: (pwd: string) => void;
  onErrorSet: () => void; // clears error
  onSubmit: () => Promise<void>; // parent provides full submit handling
  onBack: () => void;
}

const PasswordResetForm: FC<PasswordResetFormProps> = ({
  t,
  newPassword,
  confirmPassword,
  error,
  isLoading,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onErrorSet,
  onSubmit,
  onBack,
}) => {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    onErrorSet();
    await onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
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
            onNewPasswordChange(e.target.value);
            if (error) onErrorSet();
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
            onConfirmPasswordChange(e.target.value);
            if (error) onErrorSet();
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
          placeholder={t('admin.recovery.step2.confirmNewPasswordPlaceholder')}
          disabled={isLoading}
          required
        />
      </div>

      {error && (
        <p className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400"
          disabled={isLoading}
        >
          {t('button.back')}
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
  );
};

export default RecoveryModal;
