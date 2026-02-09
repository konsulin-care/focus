import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AttentionMetrics, AcsCalculationDetails } from '../../types/trial';
import { normalCDF } from '../../utils/statistics';
import { AcsCalculationModal } from './AcsCalculationModal';

interface AcsScoreCardProps {
  metrics: AttentionMetrics;
  /** Optional calculation details - enables modal when provided */
  calculationDetails?: AcsCalculationDetails;
}

export function AcsScoreCard({ metrics, calculationDetails }: AcsScoreCardProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => {
    if (calculationDetails) {
      setIsModalOpen(true);
    }
  }, [calculationDetails]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const isClickable = Boolean(calculationDetails);

  return (
    <>
      <button
        className={`mb-6 bg-blue-900/50 p-6 rounded-lg border border-blue-700 ${
          isClickable
            ? 'cursor-pointer hover:bg-blue-800/50 hover:scale-[1.02] transition-all duration-200 text-center'
            : 'cursor-default text-center'
        }`}
        onClick={openModal}
        disabled={!isClickable}
        aria-disabled={!isClickable}
      >
        <div className="text-blue-300 text-sm mb-1">
          {t('results.acs.score')}
          {isClickable && (
            <span className="ml-2 text-xs opacity-70">({t('results.acs.clickForDetails')})</span>
          )}
        </div>
        <div className="text-center">
          {metrics.acs !== null ? (
            <>
              <div className="text-5xl font-bold text-white">{metrics.acs.toFixed(2)}</div>
              <div className={`mt-2 text-lg font-medium ${
                metrics.acsInterpretation === 'normal' ? 'text-green-400' :
                metrics.acsInterpretation === 'borderline' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {metrics.acsInterpretation === 'normal' ? t('results.acs.interpretation.normal') :
                 metrics.acsInterpretation === 'borderline' ? t('results.acs.interpretation.borderline') :
                 t('results.acs.interpretation.impaired')}
              </div>
              <div className="text-blue-300 text-sm mt-2">
                F.O.C.U.S. Score: {normalCDF(metrics.acs - 1.80).toFixed(1)}%
              </div>
            </>
          ) : (
            <div className="text-3xl font-bold text-yellow-400">
              {t('results.acs.interpretation.unavailable')}
            </div>
          )}
        </div>
      </button>

      {isModalOpen && calculationDetails && (
        <AcsCalculationModal
          details={calculationDetails}
          onClose={closeModal}
        />
      )}
    </>
  );
}
