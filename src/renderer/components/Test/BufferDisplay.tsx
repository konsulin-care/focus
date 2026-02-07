import { useTranslation } from 'react-i18next';

export function BufferDisplay({ countdown }: { countdown?: number }) {
  const { t } = useTranslation('translation');
  
  return (
    <div className="text-gray-800 text-xl mb-4 font-mono">
      {countdown !== undefined ? (
        t('test.buffer.remaining', { seconds: countdown })
      ) : (
        <>
          <div>{t('test.buffer.title')}</div>
          <div className="text-lg">{t('test.buffer.description')}</div>
        </>
      )}
    </div>
  );
}
