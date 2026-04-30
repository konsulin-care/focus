import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
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
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!calculationDetails) {
      alert('ACS calculation details are not available yet.');
      return;
    }
    
    try {
      const jsonText = JSON.stringify(calculationDetails, null, 2);
      await navigator.clipboard.writeText(jsonText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Unable to copy to clipboard. Please manually select and copy the text.');
    }
  };

  // Generate calculation details when we have events and subject info
  useEffect(() => {
    if (testEvents && testEvents.length > 0 && subjectInfo) {
      const details = generateAcsCalculationDetails(testEvents, subjectInfo);
      setCalculationDetails(details);
    }
  }, [testEvents, subjectInfo]);

  return (
    <div className="mt-6 font-mono text-lg text-white max-w-2xl w-full">
      <div className="flex items-center justify-center gap-x-4 mb-4">
        <div className="text-2xl">
          {t('results.title')}
        </div>

        <button
          onClick={handleCopy}
          disabled={!calculationDetails}
          title={calculationDetails ? (t('results.copyAcsDetails') || 'Copy ACS details') : 'ACS calculation details not available'}
          aria-label={calculationDetails ? (t('results.copyAcsDetails') || 'Copy ACS details') : 'ACS calculation details not available'}
          className={`p-2 rounded ${!calculationDetails ? 'bg-gray-400 opacity-50' : 'hover:bg-gray-700 transition-colors'} ${isCopied ? 'bg-green-600' : 'bg-gray-700'}`}
        >
          {isCopied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          ) : (
            <Copy size={16} strokeWidth={1.5} />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center">
        <AcsScoreCard metrics={metrics} calculationDetails={calculationDetails ?? undefined} />
        <TrialOutcomesGrid metrics={metrics} />
        <ResponseStatsGrid metrics={metrics} />
        <ZScoresGrid metrics={metrics} />
        <ValidityWarning metrics={metrics} />
        <TestInfo metrics={metrics} elapsedTimeMs={elapsedTimeMs} />
      </div>

    </div>
  );
}
