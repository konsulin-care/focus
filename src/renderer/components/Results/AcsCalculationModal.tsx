import { useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AcsCalculationDetails } from '../../types/trial';

interface AcsCalculationModalProps {
  /** Calculation details to display */
  details: AcsCalculationDetails;
  /** Callback when modal should close */
  onClose: () => void;
}

/**
 * Modal component for displaying detailed ACS calculation breakdown.
 * Uses React Portal for proper DOM isolation and z-index management.
 * Follows WAI-ARIA modal dialog patterns for accessibility.
 */
export function AcsCalculationModal({ details, onClose }: AcsCalculationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);
  const handleBackdropKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleBackdropClick();
    }
  }, [handleBackdropClick]);
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);
  const handleContentKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="acs-modal-title"
        className="animate-swirl-pop bg-gray-900 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto outline-none"
        onClick={handleContentClick}
        onKeyDown={handleContentKeyDown}
      >
        {/* Header */}
        <h2 
          id="acs-modal-title" 
          className="text-2xl font-bold text-white mb-4"
        >
          {t('results.acs.calculationDetails')}
        </h2>

        {/* Subject Information */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-gray-400">{t('results.acs.age')}:</span>
            <span className="text-white ml-2">{details.age}</span>
          </div>
          <div>
            <span className="text-gray-400">{t('results.acs.gender')}:</span>
            <span className="text-white ml-2">{details.gender}</span>
          </div>
          <div>
            <span className="text-gray-400">{t('results.acs.normativeGroup')}:</span>
            <span className="text-white ml-2">{details.normativeGroup}</span>
          </div>
        </div>

        {/* D' Calculation */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h3 className="text-blue-400 font-medium mb-2">
            {t('results.acs.dPrimeCalculation')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-400">{t('results.acs.hitRate')}:</span>
              <span className="text-white">{(details.dPrime.hitRate * 100).toFixed(2)}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-400">{t('results.acs.falseAlarmRate')}:</span>
              <span className="text-white">{(details.dPrime.falseAlarmRate * 100).toFixed(2)}%</span>
            </div>
            <hr className="border-gray-700 my-2" />
            <div className="text-blue-300">{t('results.acs.adjustedRates')}</div>
            <div className="grid grid-cols-2 gap-2 ml-4">
              <span className="text-gray-400">{t('results.acs.hitRateAdjusted')}:</span>
              <span className="text-blue-300">{(details.dPrime.adjustedHitRate * 100).toFixed(4)}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 ml-4">
              <span className="text-gray-400">{t('results.acs.falseAlarmAdjusted')}:</span>
              <span className="text-blue-300">{(details.dPrime.adjustedFARate * 100).toFixed(4)}%</span>
            </div>
            <hr className="border-gray-700 my-2" />
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-400">zHit:</span>
              <span className="text-white">{details.dPrime.zHit.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-400">zFA:</span>
              <span className="text-white">{details.dPrime.zFA.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-700">
              <span className="text-gray-300 font-medium">{t('results.acs.dPrimeResult')}:</span>
              <span className="text-green-400 font-bold">{details.dPrime.result.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Z-Score Comparison Table */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h3 className="text-blue-400 font-medium mb-2">
            {t('results.acs.zScoreComparison')}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">{t('results.acs.metric')}</th>
                <th className="text-right py-2">{t('results.acs.yourValue')}</th>
                <th className="text-right py-2">{t('results.acs.normMean')}</th>
                <th className="text-right py-2">{t('results.acs.normSD')}</th>
                <th className="text-right py-2">{t('results.acs.zScore')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700">
                <td className="py-2 text-white">{t('results.acs.responseTime')}</td>
                <td className="text-right text-gray-300">{details.zScores.responseTime.subjectValue.toFixed(2)} ms</td>
                <td className="text-right text-gray-400">{details.zScores.responseTime.normMean.toFixed(2)}</td>
                <td className="text-right text-gray-400">{details.zScores.responseTime.normSD.toFixed(2)}</td>
                <td className="text-right text-green-400 font-medium">{details.zScores.responseTime.result.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="py-2 text-white">{t('results.acs.dPrime')}</td>
                <td className="text-right text-gray-300">{details.zScores.dPrime.subjectValue.toFixed(2)}</td>
                <td className="text-right text-gray-400">{details.zScores.dPrime.normMean.toFixed(2)}</td>
                <td className="text-right text-gray-400">{details.zScores.dPrime.normSD.toFixed(2)}</td>
                <td className="text-right text-green-400 font-medium">{details.zScores.dPrime.result.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-2 text-white">{t('results.acs.variability')}</td>
                <td className="text-right text-gray-300">{details.zScores.variability.subjectValue.toFixed(2)} ms</td>
                <td className="text-right text-gray-400">{details.zScores.variability.normMean.toFixed(2)}</td>
                <td className="text-right text-gray-400">{details.zScores.variability.normSD.toFixed(2)}</td>
                <td className="text-right text-green-400 font-medium">{details.zScores.variability.result.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Final ACS Calculation */}
        <div className="bg-blue-900/50 p-4 rounded-lg mb-6">
          <h3 className="text-blue-400 font-medium mb-2">
            {t('results.acs.finalAcs')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-300">{t('results.acs.rtZFormula')}:</span>
              <span className="text-white text-right">{details.acs.rtZ.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-300">{t('results.acs.dPrimeZFormula')}:</span>
              <span className="text-white text-right">{details.acs.dPrimeZ.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-300">{t('results.acs.variabilityZFormula')}:</span>
              <span className="text-white text-right">{details.acs.variabilityZ.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-300">{t('results.acs.constantFormula')}:</span>
              <span className="text-white text-right">+{details.acs.constant.toFixed(2)}</span>
            </div>
            <hr className="border-blue-700 my-3" />
            <div className="grid grid-cols-2 gap-2">
              <span className="text-white font-bold text-lg">{t('results.acs.finalResult')}:</span>
              <span className="text-green-400 font-bold text-2xl text-right">
                {details.acs.result.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          aria-label={t('results.acs.closeModal')}
        >
          {t('results.acs.closeModal')}
        </button>
      </div>
    </div>,
    document.body
  );
}
