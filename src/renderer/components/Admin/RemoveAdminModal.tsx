import { useState } from 'react';
import { useTranslation } from '@/i18n';

export interface RemoveAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string, wipeData: boolean) => Promise<void>;
}

/** Modal component for removing the admin account. */
export default function RemoveAdminModal({ isOpen, onClose, onConfirm }: RemoveAdminModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [wipeData, setWipeData] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /** Handles confirmation of admin removal with password verification. */
  const handleConfirm = async () => {
    if (!password) {
      setError(t('admin.changePassword.error.required'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onConfirm(password, wipeData);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.removeAdminError');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  /** Handles closing the remove admin modal without confirming. */
  const handleClose = () => {
    setPassword('');
    setWipeData(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-admin-title"
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
        <h2 id="remove-admin-title" className="text-xl font-semibold text-gray-800 mb-4">
          {t('settings.removeAdmin')}
        </h2>

        <p className="text-sm text-gray-600 mb-4">{t('settings.removeAdminDescription')}</p>

        <div className="mb-4">
          <label
            htmlFor="remove-admin-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('settings.removeAdminPassword')}
          </label>
          <input
            id="remove-admin-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white focus:ring-primary focus:border-primary"
            placeholder={t('admin.changePassword.currentPasswordPlaceholder')}
            disabled={isLoading}
          />
        </div>

        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={wipeData}
            onChange={(e) => {
              setWipeData(e.target.checked);
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-700">{t('settings.removeAdminWipe')}</span>
        </label>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
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
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? t('settings.removing') : t('settings.removeAdmin')}
          </button>
        </div>
      </div>
    </div>
  );
}
