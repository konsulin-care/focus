import { AttentionMetrics } from '@/renderer/types/trial';

interface TestInfoProps {
  metrics: AttentionMetrics;
  elapsedTimeMs: number;
}

export function TestInfo({ metrics, elapsedTimeMs }: TestInfoProps) {
  // Calculate total user-initiated responses using raw counts
  // This accurately captures all button presses: hits + commissions + anticipatory + multiple
  const totalResponses = metrics.hits + metrics.commissions + 
                          metrics.anticipatoryResponses + metrics.multipleResponses;

  const minutes = Math.floor(elapsedTimeMs / 60000);
  const seconds = String(Math.floor((elapsedTimeMs % 60000) / 1000)).padStart(2, '0');

  return (
    <>
      {metrics.trialCount < 648 && (
        <div className="mt-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-xs">Partial Test ({metrics.trialCount} trials)</div>
          <div className="text-gray-300 text-xs">Scaling: {(metrics.scalingFactor * 100).toFixed(1)}% of full test</div>
        </div>
      )}
      
      <div className="mt-4 text-gray-400">
        Total responses: {totalResponses}
      </div>
      <div className="text-gray-400">
        Duration: {minutes}m {seconds}s
      </div>
    </>
  );
}
