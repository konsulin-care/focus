import { useState, type FC, type FormEvent } from 'react';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/renderer/store';
import { constantTimeEquals } from '@/renderer/utils/constantTime';

export interface AdminRegisterModalProps {
  isOpen: boolean;
  onComplete: (recoveryKey: string) => void;
}

/**
 * Modal wrapper for first-time admin account registration.
 * Manages state and delegates rendering to extracted components.
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

  if (!isOpen) return null;

  // Determine which phase to show
  if (recoveryKey) {
    return (
      <RecoveryKeyPhase
        t={t}
        recoveryKey={recoveryKey}
        hasSavedKey={hasSavedKey}
        isLoading={isLoading}
        onHasSavedKeyChange={setHasSavedKey}
        onCopy={handleCopyKey}
        onContinue={handleContinue}
        onClose={handleClose}
      />
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
      <RegistrationForm
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        error={error}
        isLoading={isLoading}
        t={t}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onErrorSet={setError}
        onSubmit={handleRegister}
        onCancel={handleClose}
      />
    </div>
  );

  /** Resets all form fields to their initial empty state. */
  function handleClose() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsLoading(false);
    setRecoveryKey('');
    setHasSavedKey(false);
  }

  /** Copies the recovery key to clipboard. */
  function handleCopyKey() {
    navigator.clipboard.writeText(recoveryKey).catch(() => {});
  }

  /** Continues after acknowledging recovery key. */
  async function handleContinue() {
    try {
      const result = await window.electronAPI.authLogin(password);
      useAuthStore.getState().login(result.sessionToken);
      onComplete(recoveryKey);
    } catch {
      // Login failed - user will need to use login modal
    }
    setSetupComplete(true);
    handleClose();
  }

  /** Handles registration form submission for admin account creation. */
  async function handleRegister(e: FormEvent) {
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

    if (!constantTimeEquals(password, confirmPassword)) {
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
  }

  function validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }
};

/**
 * Registration form component extracted to reduce JSX nesting depth.
 */
interface RegistrationFormProps {
  email: string;
  password: string;
  confirmPassword: string;
  error: string;
  isLoading: boolean;
  t: (key: string) => string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onErrorSet: (error: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

const RegistrationForm: FC<RegistrationFormProps> = ({
  email,
  password,
  confirmPassword,
  error,
  isLoading,
  t,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onErrorSet,
  onSubmit,
  onCancel,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6 space-y-4"
    >
      <h2 id="register-title" className="text-xl font-semibold text-gray-800 mb-4">
        {t('admin.register.title')}
      </h2>

      {/* Email */}
      <div>
        <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('admin.register.email')}
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => {
            onEmailChange(e.target.value);
            if (error) onErrorSet('');
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
          placeholder={t('admin.register.emailPlaceholder')}
          disabled={isLoading}
          required
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
          {t('admin.register.password')}
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => {
            onPasswordChange(e.target.value);
            if (error) onErrorSet('');
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
            onConfirmPasswordChange(e.target.value);
            if (error) onErrorSet('');
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
          placeholder={t('admin.register.confirmPasswordPlaceholder')}
          disabled={isLoading}
          required
        />
      </div>

      {/* Error display */}
      {error && (
        <p className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
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
  );
};

/**
 * Recovery key phase component (after registration, before completion).
 */
interface RecoveryKeyPhaseProps {
  t: (key: string) => string;
  recoveryKey: string;
  hasSavedKey: boolean;
  isLoading: boolean;
  onHasSavedKeyChange: (checked: boolean) => void;
  onCopy: () => void;
  onContinue: () => void;
  onClose: () => void;
}

const RecoveryKeyPhase: FC<RecoveryKeyPhaseProps> = ({
  t,
  recoveryKey,
  hasSavedKey,
  isLoading,
  onHasSavedKeyChange,
  onCopy,
  onContinue,
  onClose,
}) => {
  return (
    <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6 space-y-4">
      <h2 id="recovery-key-title" className="text-xl font-semibold text-gray-800">
        {t('admin.register.title')}
      </h2>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded p-3">
        <p className="text-sm text-amber-800 font-medium">{t('admin.register.saveWarning')}</p>
      </div>

      {/* Recovery key display */}
      <label htmlFor="recovery-key" className="block text-sm font-medium text-gray-700">
        {t('admin.register.recoveryKey')}
      </label>
      <div className="flex gap-2 mb-4">
        <code
          id="recovery-key"
          className="flex-1 block rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-gray-50 font-mono text-sm break-all"
        >
          {recoveryKey}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium transition-colors text-sm"
          aria-label={t('admin.register.copy')}
        >
          {t('admin.register.copy')}
        </button>
      </div>

      {/* Acknowledgement checkbox */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={hasSavedKey}
          onChange={(e) => {
            onHasSavedKeyChange(e.target.checked);
          }}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-700">{t('admin.register.acknowledge')}</span>
      </label>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400"
          disabled={isLoading}
        >
          {t('admin.register.back')}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-[#099B9E] font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={!hasSavedKey}
        >
          {t('admin.register.continue')}
        </button>
      </div>
    </div>
  );
};

export default AdminRegisterModal;
