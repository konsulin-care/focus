import { useNavigation } from '../../store';
import { TestPhase } from '../../hooks/useTestPhase';

interface TestHeaderProps {
  phase: TestPhase;
  isCursorHidden?: boolean;
  onExitTest?: () => void;
}

export function TestHeader({ phase, isCursorHidden = false, onExitTest }: TestHeaderProps) {
  const { endTest } = useNavigation();

  const shouldDim = phase === 'running' && isCursorHidden;
  const handleExit = onExitTest || endTest;

  return (
    <>
      {/* Exit Test button */}
      <button
        onClick={handleExit}
        aria-hidden={shouldDim}
        className={`absolute top-4 left-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium transition-all ${
          shouldDim
            ? 'opacity-20 cursor-not-allowed pointer-events-none'
            : 'hover:bg-gray-300'
        }`}
      >
        ← Exit Test
      </button>
    </>
  );
}
