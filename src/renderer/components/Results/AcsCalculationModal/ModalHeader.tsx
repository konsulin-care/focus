import { useTranslation } from 'react-i18next';

interface ModalHeaderProps {
  title: string;
}

/**
 * Modal header component with consistent styling.
 */
export function ModalHeader({ title }: ModalHeaderProps) {
  const { t } = useTranslation();
  
  return (
    <h2 
      id="acs-modal-title" 
      className="text-2xl font-bold text-white mb-4"
    >
      {t(title)}
    </h2>
  );
}
