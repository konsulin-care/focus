import { TestPhase } from '../../hooks/useTestPhase';

interface TestHeaderProps {
  phase: TestPhase;
  onExitTest: () => void;
}

export function TestHeader({ phase, onExitTest }: TestHeaderProps) {
  if (phase !== 'completed') {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-50">
      <button
        onClick={onExitTest}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
      >
        Exit Test
      </button>
    </div>
  );
}
