import { useRef, useEffect } from 'react';
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
 * Uses native HTML <dialog> element for built-in accessibility:
 * - Focus trapping
 * - Keyboard navigation (Escape to close)
 * - Screen reader support
 * - Touch support
 * 
 * Maximum JSX nesting depth: 4 levels
 */
export function AcsCalculationModal({ details, onClose }: AcsCalculationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();
  
  // Show/hide dialog using native API
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    
    dialog.showModal();
    const handleCancel = () => onClose();
    dialog.addEventListener('close', handleCancel);
    
    return () => {
      dialog.removeEventListener('close', handleCancel);
      dialog.close();
    };
  }, [onClose]);
  
  // Handle backdrop click - dialog element handles Escape key natively
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    const isInDialog =
      rect &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    
    if (!isInDialog) {
      onClose();
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-transparent p-6 max-w-2xl w-full mx-auto max-h-[90vh] outline-none"
      aria-labelledby="acs-modal-title"
    >
      {/* Inner container for styling - this is the visible modal */}
      <div className="animate-swirl-pop bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto outline-none">
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

        {/* Warning when normative data is unavailable */}
        {!details.normativeAvailable && (
          <div className="bg-yellow-600/20 border border-yellow-600 p-4 rounded-lg mb-6" role="alert">
            <p className="text-yellow-200 text-sm">
              {t('results.acs.noNormativeData')}
            </p>
          </div>
        )}

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
    </dialog>,
    document.body
  );
}
