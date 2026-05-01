import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import type { TestEvent } from '@/renderer/types/electronAPI';
import type { AttentionMetrics, SubjectInfo, AcsCalculationDetails } from '@/renderer/types/trial';
import { generateAcsCalculationDetails } from '@/renderer/utils/acs-calculation';
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

/**
 * Component that displays the results summary including ACS calculation details,
 * trial outcomes, response statistics, Z-scores, validity warnings, and test info.
 * @param props - The properties containing metrics, elapsed time, test events, and subject info
 */
export function ResultsSummary({ metrics, elapsedTimeMs, testEvents, subjectInfo }: ResultsSummaryProps) {
  const { t } = useTranslation();
  const [calculationDetails, setCalculationDetails] = useState<AcsCalculationDetails | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles copying the ACS calculation details to clipboard
   */
  const handleCopy = async () => {
    try {
      const jsonText = JSON.stringify(calculationDetails, null, 2);
      await navigator.clipboard.writeText(jsonText);
      setIsCopied(true);
      setTimeout(() => { setIsCopied(false); }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Unable to copy to clipboard. Please manually select and copy the text.');
    }
  };

  /**
   * Wrapper for handleCopy to properly handle Promise in onClick handler
   */
  const handleCopyClick = () => {
    handleCopy().catch(err => {
      console.error('Unexpected error in copy handler:', err);
      // Error is already handled in handleCopy, but this catches any unexpected errors
    });
  };

   // Generate calculation details when we have events and subject info
   useEffect(() => {
     if (testEvents && testEvents.length > 0 && subjectInfo) {
       const details = generateAcsCalculationDetails(testEvents, subjectInfo);
       setCalculationDetails(details);
     }
     return undefined;
   }, [testEvents, subjectInfo]);

   // Clear error message after 5 seconds
   useEffect(() => {
     if (error) {
       const timer = setTimeout(() => { setError(null); }, 5000);
       return () => { clearTimeout(timer); };
     }
     return undefined;
   }, [error]);

  return (
    <div className="mt-6 font-mono text-lg text-white max-w-2xl w-full">

      <div className="flex items-center justify-center gap-x-4 mb-4">
        <div className="text-2xl">
          {t('results.title')}
        </div>

          <button
            type="button"
            onClick={handleCopyClick}
            disabled={!calculationDetails}
            title={calculationDetails ? (t('results.copyAcsDetails') || 'Copy ACS details') : 'ACS calculation details not available'}
            aria-label={calculationDetails ? (t('results.copyAcsDetails') || 'Copy ACS details') : 'ACS calculation details not available'}
            className={`p-2 rounded transition-colors ${!calculationDetails ? 'bg-gray-400 opacity-50' : isCopied ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {isCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                <title>{t('results.copied')}</title>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <Copy size={16} strokeWidth={1.5} />
            )}
          </button>

        {error && (
          <div className="mt-2 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch text-center">
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
