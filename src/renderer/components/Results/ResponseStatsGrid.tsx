import { useTranslation } from 'react-i18next';
import { AttentionMetrics } from '../../types/trial';

interface ResponseStatsGridProps {
  metrics: AttentionMetrics;
}

export function ResponseStatsGrid({ metrics }: ResponseStatsGridProps) {
  const { t } = useTranslation();
  
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 text-left bg-gray-800 p-4 rounded-lg">
      <div>
        <div className="text-gray-400 text-sm">{t('results.metrics.responseTimeMean')}</div>
        <div className="text-xl">{metrics.meanResponseTimeMs.toFixed(1)}ms</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.metrics.responseTimeVariability')}</div>
        <div className="text-xl">{metrics.variability.toFixed(1)}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">{t('results.metrics.dPrime')}</div>
        <div className="text-xl">{metrics.dPrime.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-gray-400 text-sm">Anticipatory Responses</div>
        <div className="text-xl">{metrics.validity.anticipatoryResponses}</div>
      </div>
    </div>
  );
}
