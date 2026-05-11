import { useState, type FC, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/renderer/store';
import { constantTimeEquals } from '@/renderer/utils/constantTime';

export interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * Modal wrapper for authenticated admins to change their password.
 * Contains backdrop, key handling, and delegates form rendering.
 */
export const ChangePasswordModal: FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('translation');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !isAuthenticated) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <ChangePasswordForm
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        error={error}
        success={success}
        isLoading={isLoading}
        t={t}
        onCurrentPasswordChange={setCurrentPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onErrorSet={setError}
        onSuccessSet={setSuccess}
        setIsLoading={setIsLoading}
        onClose={onClose}
      />
    </div>
  );

  /** Handles backdrop click to close the modal. */
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  /** Handles keydown events (Escape key) to close the modal. */
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }

  /** Handles closing the modal and resetting form state. */
  function handleClose() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    setIsLoading(false);
    onClose?.();
  }
};

/**
 * Change password form component extracted to reduce JSX nesting depth.
 */
interface ChangePasswordFormProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  success: boolean;
  isLoading: boolean;
  t: (key: string) => string;
  onCurrentPasswordChange: (password: string) => void;
  onNewPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onErrorSet: (error: string) => void;
  onSuccessSet: (success: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  onClose?: () => void;
}

const ChangePasswordForm: FC<ChangePasswordFormProps> = ({
  currentPassword,
  newPassword,
  confirmPassword,
  error,
  success,
  isLoading,
  t,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onErrorSet,
  onSuccessSet,
  setIsLoading,
  onClose,
}) => {
  /** Handles form submission for changing the admin password. */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    onErrorSet('');
    onSuccessSet(false);

    // Validation
    if (!currentPassword.trim()) {
      onErrorSet(t('admin.changePassword.error.required'));
      return;
    }

    if (newPassword.length < 8) {
      onErrorSet(t('admin.changePassword.error.newPasswordLength'));
      return;
    }

    if (!constantTimeEquals(newPassword, confirmPassword)) {
      onErrorSet(t('admin.changePassword.error.passwordsMatch'));
      return;
    }

    setIsLoading(true);

    try {
      await window.electronAPI.authChangePassword(currentPassword, newPassword);
      onSuccessSet(true);

      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.changePassword.error.failed');
      onErrorSet(message);
    } finally {
      setIsLoading(false);
    }
  };

  /** Handles closing the modal and resetting form state. */
  function handleClose() {
    onCurrentPasswordChange('');
    onNewPasswordChange('');
    onConfirmPasswordChange('');
    onErrorSet('');
    onSuccessSet(false);
    setIsLoading(false);
    onClose?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6 space-y-4"
    >
      <h2 id="change-password-title" className="text-xl font-semibold text-gray-800">
        {t('admin.changePassword.title')}
      </h2>

      <div>
        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
          {t('admin.changePassword.currentPassword')}
        </label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => {
            onCurrentPasswordChange(e.target.value);
            if (error) onErrorSet('');
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
          placeholder={t('admin.changePassword.currentPasswordPlaceholder')}
          disabled={isLoading}
          required
        />
      </div>

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
          {t('admin.changePassword.newPassword')}
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => {
            onNewPasswordChange(e.target.value);
            if (error) onErrorSet('');
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
          placeholder={t('admin.changePassword.newPasswordPlaceholder')}
          disabled={isLoading}
          required
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
          {t('admin.changePassword.confirmNewPassword')}
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            onConfirmPasswordChange(e.target.value);
            if (error) onErrorSet('');
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
          placeholder={t('admin.changePassword.confirmNewPasswordPlaceholder')}
          disabled={isLoading}
          required
        />
      </div>

      {error && (
        <p className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">{error}</p>
      )}

      {success && (
        <p className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-600">
          {t('admin.changePassword.success')}
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
            ? t('admin.changePassword.changing')
            : t('admin.changePassword.changePassword')}
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordModal;
