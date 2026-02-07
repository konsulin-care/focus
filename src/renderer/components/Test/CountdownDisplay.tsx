import { useTranslation } from 'react-i18next';

interface CountdownDisplayProps {
  countdown: number;
}

export function CountdownDisplay({ countdown }: CountdownDisplayProps) {
  const { t } = useTranslation('translation');
  
  return (
    <div className="flex flex-col items-center text-white font-mono">
      <div className="text-3xl mb-6">{t('test.countdown.title')}</div>
      <div className="text-9xl font-bold tracking-tight">{countdown}</div>
    </div>
  );
}
