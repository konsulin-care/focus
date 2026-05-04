import { useTranslation } from 'react-i18next';
import { AttentionMetrics } from '@/renderer/types/trial';

interface ValidityWarningProps {
  metrics: AttentionMetrics;
}

/**
 * Component for displaying validity warning when test results are invalid
 * @param props - Component props containing attention metrics
 */
export function ValidityWarning({ metrics }: ValidityWarningProps) {
  const { t } = useTranslation();

  if (metrics.validity.valid) return null;

  return (
    <div className="mt-4 bg-yellow-900/50 p-3 rounded-lg border border-yellow-700">
      <div className="text-yellow-400 text-sm font-medium">{t('results.validity.invalid')}</div>
      <div className="text-yellow-300 text-xs">{metrics.validity.exclusionReason}</div>
    </div>
  );
}
