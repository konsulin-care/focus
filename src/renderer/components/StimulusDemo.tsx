import React from 'react';

// Stimulus Box Component
interface StimulusBoxProps {
  type: 'target' | 'non-target';
}

const StimulusBox: React.FC<StimulusBoxProps> = ({ type }) => {
  const isTarget = type === 'target';
  
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Stimulus Square - 100x100px with 8px black border */}
      <div className="relative w-[100px] h-[100px] bg-white border-[8px] border-black flex items-center justify-center">
        {/* Inner black square - 10x10px */}
        <div
          className="bg-black"
          style={{
            width: '10px',
            height: '10px',
            position: 'absolute',
            top: isTarget ? '25%' : '75%',
          }}
        />
      </div>
      
      {/* Label */}
      <span className="text-sm text-gray-600 font-semibold">
        {isTarget ? 'TARGET' : 'NON-TARGET'}
      </span>
    </div>
  );
};

// Main StimulusDemo Component
const StimulusDemo: React.FC = () => {
  return (
    <div className="flex gap-12 justify-center">
      {/* Target Column */}
      <StimulusBox type="target" />

      {/* Non-Target Column */}
      <StimulusBox type="non-target" />
    </div>
  );
};

export default StimulusDemo;
