import { useTranslation } from 'react-i18next';
import { AttentionMetrics } from '../../types/trial';

interface ZScoresGridProps {
  metrics: AttentionMetrics;
}

export function ZScoresGrid({ metrics }: ZScoresGridProps) {
  const { t } = useTranslation();
  
  const formatZScore = (value: number | null) => {
    if (value === null) return <span className="text-gray-500">—</span>;
    return value.toFixed(2);
  };
  
  return (
    <div className="mt-4 grid grid-cols-3 gap-4 text-left bg-gray-800 p-4 rounded-lg">
      <div>
        <div className="text-gray-400 text-sm">{t('results.zScores.responseTime')}</div>
        <div className="text-xl">{formatZScore(metrics.zScores.responseTime)}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.zScores.dPrime')}</div>
        <div className="text-xl">{formatZScore(metrics.zScores.dPrime)}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.zScores.variability')}</div>
        <div className="text-xl">{formatZScore(metrics.zScores.variability)}</div>
      </div>
    </div>
  );
}
