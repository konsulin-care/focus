import { useTranslation } from 'react-i18next';
import { useNavigation } from '../store';
import packageInfo from '@/../package.json';

export default function About() {
  const { t } = useTranslation();
  const { setPage } = useNavigation();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        {t('about.title')}
      </h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          {t('about.appInfo')}
        </h2>
        <div className="space-y-2 text-gray-600">
          <p><strong>{t('about.version')}:</strong> {packageInfo.version}</p>
          <p><strong>{t('about.build')}:</strong> {t('about.buildDetails', { electron: packageInfo.devDependencies?.electron?.replace('^', '') || '40.1.0', react: packageInfo.dependencies?.react?.replace('^', '') || '19.2.4' })}</p>
          <p><strong>{t('about.platform')}:</strong> {t('about.platformDesktop')}</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          {t('about.focusTitle')}
        </h2>
        <p className="text-gray-600 mb-4">
          {t('about.focusDescription')}
        </p>
        <p className="text-gray-600">
          {t('about.focusMetrics')}
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          {t('about.technicalFeatures')}
        </h2>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>{t('about.features.precision')}</li>
          <li>{t('about.features.metrics')}</li>
          <li>{t('about.features.normative')}</li>
          <li>{t('about.features.privacy')}</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          {t('about.supportContact')}
        </h2>
        <p className="text-gray-600 mb-2">
          {t('about.supportText')}
        </p>
        <p className="text-gray-600">
          <strong>{t('about.emailLabel')}</strong> <a href="mailto:hello@konsulin.care">hello@konsulin.care</a>
        </p>
      </div>

      <button
        onClick={() => setPage('home')}
        className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
      >
        {t('about.backToHome')}
      </button>
    </div>
  );
}
