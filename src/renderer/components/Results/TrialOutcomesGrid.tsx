import { useTranslation } from 'react-i18next';
import { AttentionMetrics } from '../../types/trial';

interface TrialOutcomesGridProps {
  metrics: AttentionMetrics;
}

export function TrialOutcomesGrid({ metrics }: TrialOutcomesGridProps) {
  const { t } = useTranslation();
  const hitCount = metrics.hits;
  const omissionCount = metrics.omissions;
  const commissionCount = metrics.commissions;
  const correctRejectionCount = metrics.correctRejections;

  return (
    <div className="grid grid-cols-2 gap-4 text-left bg-gray-800 p-4 rounded-lg">
      <div>
        <div className="text-gray-400 text-sm">{t('results.metrics.hits')}</div>
        <div className="text-xl">{hitCount}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.trialOutcomes.omission')} ({metrics.omissionPercent.toFixed(1)}%)</div>
        <div className="text-xl">{omissionCount}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.trialOutcomes.commission')} ({metrics.commissionPercent.toFixed(1)}%)</div>
        <div className="text-xl">{commissionCount}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.trialOutcomes.correct')}</div>
        <div className="text-xl">{correctRejectionCount}</div>
      </div>
    </div>
  );
}
