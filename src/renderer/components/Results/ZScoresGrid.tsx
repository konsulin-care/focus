import { useTranslation } from 'react-i18next';
import { AttentionMetrics } from '../../types/trial';

interface ZScoresGridProps {
  metrics: AttentionMetrics;
}

export function ZScoresGrid({ metrics }: ZScoresGridProps) {
  const { t } = useTranslation();
  
  return (
    <div className="mt-4 grid grid-cols-3 gap-4 text-left bg-gray-800 p-4 rounded-lg">
      <div>
        <div className="text-gray-400 text-sm">{t('results.zScores.responseTime')}</div>
        <div className="text-xl">{metrics.zScores.responseTime.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.zScores.dPrime')}</div>
        <div className="text-xl">{metrics.zScores.dPrime.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.zScores.variability')}</div>
        <div className="text-xl">{metrics.zScores.variability.toFixed(2)}</div>
      </div>
    </div>
  );
}
