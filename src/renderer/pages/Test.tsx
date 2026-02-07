import { useTranslation } from '@/i18n';
import { useNavigation } from '../store';
import StimulusDemo from '../components/StimulusDemo';
import { useEffect, useState } from 'react';
import { calculateTestDuration } from '@/renderer/utils/duration';
import { TestConfig } from '@/renderer/types/electronAPI';

export default function Test() {
  const { t } = useTranslation('translation', { keyPrefix: 'test.page' });
  const { t: buttonT } = useTranslation('translation', { keyPrefix: 'button' });
  const { startTest } = useNavigation();
  const [testDuration, setTestDuration] = useState<number>(21.6); // Default fallback
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTestConfig = async () => {
      try {
        const config: TestConfig = await window.electronAPI.getTestConfig();
        const duration = calculateTestDuration(config);
        setTestDuration(duration);
      } catch (error) {
        console.error('Failed to fetch test config:', error);
        // Keep default 21.6 value on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestConfig();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        {t('title')}
      </h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <p className="text-yellow-800 text-lg mb-4">
          {t('description')}
        </p>
        <ul className="list-disc list-inside mt-4 text-yellow-800 space-y-2">
          <li>{isLoading ? t('duration', { duration: testDuration.toString() }) : t('duration', { duration: testDuration.toString() })}</li>
          <li>{t('respondTarget')}</li>
          <li>{t('noRespondNonTarget')}</li>
          <li>{t('precision')}</li>
        </ul>
      </div>

      <div className="mb-6">
        <StimulusDemo />
      </div>

      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">{t('beforeBegin')}</h2>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>{t('quietEnvironment')}</li>
          <li>{t('seeClearly')}</li>
          <li>{t('useEither')}</li>
          <li>{t('cannotPause')}</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <button
          onClick={startTest}
          className="px-8 py-4 bg-primary hover:bg-[#099B9E] text-white text-xl font-semibold rounded-lg transition-colors shadow-lg"
        >
          {buttonT('next')}
        </button>
      </div>
    </div>
  );
}
