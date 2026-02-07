import { useTranslation } from 'react-i18next';
import { AttentionMetrics } from '../../types/trial';
import { AcsScoreCard } from './AcsScoreCard';
import { TrialOutcomesGrid } from './TrialOutcomesGrid';
import { ResponseStatsGrid } from './ResponseStatsGrid';
import { ZScoresGrid } from './ZScoresGrid';
import { ValidityWarning } from './ValidityWarning';
import { TestInfo } from './TestInfo';

interface ResultsSummaryProps {
  metrics: AttentionMetrics;
  elapsedTimeMs: number;
}

export function ResultsSummary({ metrics, elapsedTimeMs }: ResultsSummaryProps) {
  const { t } = useTranslation();
  
  return (
    <div className="mt-6 text-center font-mono text-lg text-white max-w-2xl">
      <div className="text-2xl mb-4">{t('results.title')}</div>
      
      <AcsScoreCard metrics={metrics} />
      <TrialOutcomesGrid metrics={metrics} />
      <ResponseStatsGrid metrics={metrics} />
      <ZScoresGrid metrics={metrics} />
      <ValidityWarning metrics={metrics} />
      <TestInfo metrics={metrics} elapsedTimeMs={elapsedTimeMs} />
    </div>
  );
}
