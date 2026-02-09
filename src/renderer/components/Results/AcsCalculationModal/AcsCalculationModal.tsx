import { useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AcsCalculationDetails } from '../../../types/trial';
import { ModalHeader } from './ModalHeader';
import { SubjectInfoSection } from './SubjectInfoSection';
import { DPrimeSection } from './DPrimeSection';
import { ZScoreTable } from './ZScoreTable';
import { AcsResultSection } from './AcsResultSection';

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
 * 
 * Maximum JSX nesting depth: 4 levels
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
        <ModalHeader title="results.acs.calculationDetails" />

        {/* Subject Information */}
        <SubjectInfoSection 
          age={details.age}
          gender={details.gender}
          normativeGroup={details.normativeGroup}
        />

        {/* D' Calculation */}
        <DPrimeSection dPrime={details.dPrime} />

        {/* Z-Score Comparison Table */}
        <ZScoreTable zScores={details.zScores} />

        {/* Final ACS Calculation */}
        <AcsResultSection acs={details.acs} />

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
