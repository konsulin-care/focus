import { StimulusType } from '@/renderer/types/electronAPI';
import { TargetStimulus } from './TargetStimulus';
import { NonTargetStimulus } from './NonTargetStimulus';

interface StimulusContainerProps {
  isVisible: boolean;
  stimulusType: StimulusType | null;
}

/**
 * Render a centered stimulus area with a persistent fixation point and an overlaying stimulus whose visibility and content are controlled by props.
 *
 * @param isVisible - If `true`, shows the large white stimulus overlay; if `false`, the overlay is hidden (fixation point remains visible).
 * @param stimulusType - Determines the overlay's content: `'target'` renders a TargetStimulus, `'non-target'` renders a NonTargetStimulus, or `null` renders no inner stimulus.
 * @returns The rendered stimulus container element.
 */
export function StimulusContainer({ isVisible, stimulusType }: StimulusContainerProps) {
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Reserved space above stimulus */}
      <div className="h-[120px]" />
      
      {/* Stimulus wrapper */}
      <div className="relative flex items-center justify-center">
        {/* Fixation point - always visible, centered */}
        <div className="w-[10px] h-[10px] bg-white z-0" />
        
        {/* Large white square stimulus - overlays fixation point when visible */}
        <div 
          className={`absolute transition-opacity duration-75 ease-in-out ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ width: '150px', height: '150px', backgroundColor: 'white', zIndex: 1 }}
        >
          {stimulusType === 'target' && <TargetStimulus />}
          {stimulusType === 'non-target' && <NonTargetStimulus />}
        </div>
      </div>
      
      {/* Reserved space below stimulus */}
      <div className="h-[120px]" />
    </div>
  );
}