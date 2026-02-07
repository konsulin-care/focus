import { useTranslation } from 'react-i18next';

interface TrialProgressProps {
  currentTrial: number;
  totalTrials: number;
}

export function TrialProgress({ currentTrial, totalTrials }: TrialProgressProps) {
  const { t } = useTranslation('translation');
  
  return (
    <div className="text-gray-800 text-xl mb-4 font-mono">
      {t('test.running.progress', { current: currentTrial, total: totalTrials })}
    </div>
  );
}
