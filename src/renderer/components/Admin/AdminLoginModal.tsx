import { useState, type FC, type KeyboardEvent } from 'react';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/renderer/store';

export interface AdminLoginModalProps {
  isOpen: boolean;
  mandatory?: boolean;
  onSuccess?: () => void;
  onClose?: () => void; // dismiss modal (stay on page)
  onBack?: () => void; // navigate to last public page
  onForgotPassword?: () => void;
}

/**
 * Modal component for admin login authentication.
 * Shown when a user is not authenticated but needs access to protected pages.
 */
export const AdminLoginModal: FC<AdminLoginModalProps> = ({
  isOpen,
  mandatory = false,
  onSuccess,
  onClose,
  onBack,
  onForgotPassword,
}) => {
  const { t } = useTranslation('translation');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);

  const handleClose = () => {
    setPassword('');
    setError('');
    setIsLoading(false);
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError(t('admin.login.error.required'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electronAPI.authLogin(password);
      login(result.sessionToken);
      onSuccess?.();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.login.error.invalid');

      if (message.toLowerCase().includes('lockout') || message.toLowerCase().includes('locked')) {
        setError(message);
      } else {
        setError(t('admin.login.error.invalid'));
      }
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      onClose?.();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onClose?.();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !mandatory) {
      handleClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && !mandatory) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
        <h2 id="admin-login-title" className="text-xl font-semibold text-gray-800 mb-4">
          {t('admin.login.title')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('admin.login.password')}
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
              placeholder={t('admin.login.placeholder')}
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

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              disabled={isLoading}
            >
              {t('admin.login.forgotPassword')}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {t('button.back')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-[#099B9E] font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? t('admin.login.loggingIn') : t('admin.login.login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;
