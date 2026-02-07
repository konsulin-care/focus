import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation resources
import enTranslation from '../locales/en/translation.json';
import enCommon from '../locales/en/common.json';
import idTranslation from '../locales/id/translation.json';
import idCommon from '../locales/id/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Supported languages
    supportedLngs: ['en', 'id'],
    
    // Fallback configuration
    fallbackLng: 'en',
    fallbackNS: 'common',
    defaultNS: 'translation',
    
    // Debug in development
    debug: process.env.NODE_ENV === 'development',
    
    // Interpolation - React handles escaping
    interpolation: {
      escapeValue: false,
    },
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    // React options
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
    },
    
    // Resources (embedded for Electron app)
    resources: {
      en: {
        translation: enTranslation,
        common: enCommon,
      },
      id: {
        translation: idTranslation,
        common: idCommon,
      },
    },
  });

export default i18n;
