import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TestEvent } from '../../types/electronAPI';
import { AttentionMetrics, SubjectInfo, AcsCalculationDetails } from '../../types/trial';
import { generateAcsCalculationDetails } from '../../utils/acs-calculation';
import { AcsScoreCard } from './AcsScoreCard';
import { TrialOutcomesGrid } from './TrialOutcomesGrid';
import { ResponseStatsGrid } from './ResponseStatsGrid';
import { ZScoresGrid } from './ZScoresGrid';
import { ValidityWarning } from './ValidityWarning';
import { TestInfo } from './TestInfo';

interface ResultsSummaryProps {
  metrics: AttentionMetrics;
  elapsedTimeMs: number;
  testEvents: TestEvent[];
  subjectInfo: SubjectInfo;
}

export function ResultsSummary({ metrics, elapsedTimeMs, testEvents, subjectInfo }: ResultsSummaryProps) {
  const { t } = useTranslation();
  const [calculationDetails, setCalculationDetails] = useState<AcsCalculationDetails | null>(null);

  // Generate calculation details when we have events and subject info
  useEffect(() => {
    if (testEvents && testEvents.length > 0 && subjectInfo) {
      const details = generateAcsCalculationDetails(testEvents, subjectInfo);
      setCalculationDetails(details);
    }
  }, [testEvents, subjectInfo]);

  return (
    <div className="mt-6 text-center font-mono text-lg text-white max-w-2xl">
      <div className="text-2xl mb-4">{t('results.title')}</div>

      <AcsScoreCard metrics={metrics} calculationDetails={calculationDetails ?? undefined} />
      <TrialOutcomesGrid metrics={metrics} />
      <ResponseStatsGrid metrics={metrics} />
      <ZScoresGrid metrics={metrics} />
      <ValidityWarning metrics={metrics} />
      <TestInfo metrics={metrics} elapsedTimeMs={elapsedTimeMs} />
    </div>
  );
}
