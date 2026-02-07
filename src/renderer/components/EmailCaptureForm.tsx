import { useState, FormEvent, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { SubjectInfo } from '../types/trial';

export interface EmailCaptureFormProps {
  testData: string;  // JSON string of test events
  onSuccess: (subjectInfo: SubjectInfo) => void;
  onSkip?: (subjectInfo: SubjectInfo) => void;  // Called when user clicks Preview
  lng?: string;  // Language code for i18n
}

export function EmailCaptureForm({ testData, onSuccess, onSkip, lng }: EmailCaptureFormProps) {
  const { t, i18n } = useTranslation();
  const [age, setAge] = useState<number>(0);
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update i18n language when lng prop changes
  useEffect(() => {
    if (lng && lng !== i18n.language) {
      i18n.changeLanguage(lng);
    }
  }, [lng, i18n]);

  const subjectInfo: SubjectInfo = { age, gender: gender as 'Male' | 'Female' };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];
    
    // Age validation
    if (age < 0 || age > 120 || !Number.isInteger(age)) {
      newErrors.push(t('error.invalidAge'));
    }
    
    // Gender validation
    if (gender !== 'Male' && gender !== 'Female') {
      newErrors.push(t('error.invalidGender'));
    }
    
    // Email validation - RFC 5322 compliant regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!email || !emailRegex.test(email)) {
      newErrors.push(t('error.invalidEmail'));
    }
    
    // Consent validation
    if (!consent) {
      newErrors.push(t('error.required'));
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors([]);
    
    try {
      const consentTimestamp = new Date().toISOString();
      await window.electronAPI.saveTestResultWithConsent(
        testData,
        email,
        consent,
        consentTimestamp
      );
      onSuccess(subjectInfo);
    } catch (error) {
      console.error('Failed to save test result:', error);
      setErrors([t('error.saveFailed')]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('emailForm.title')}</h2>
        <p className="text-sm text-gray-600 mb-4">
          {t('emailForm.description')}
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              {t('emailForm.fields.age')}
            </label>
            <input
              id="age"
              type="number"
              min="0"
              max="120"
              value={age || ''}
              onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white"
              placeholder={t('emailForm.fields.age')}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              {t('emailForm.fields.gender')}
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white"
              disabled={isSubmitting}
              required
            >
              <option value="" disabled hidden>{t('emailForm.fields.selectGender')}</option>
              <option value="Male">{t('emailForm.fields.genderMale')}</option>
              <option value="Female">{t('emailForm.fields.genderFemale')}</option>
            </select>
          </div>
        </div>
        
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('emailForm.fields.email')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white"
          placeholder={t('emailForm.fields.email')}
          disabled={isSubmitting}
          required
        />
      </div>
      
      <div className="flex items-start">
        <input
          id="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          disabled={isSubmitting}
          required
        />
        <label htmlFor="consent" className="ml-2 text-sm text-gray-600">
          {t('emailForm.consent.text')}
        </label>
      </div>
      
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          {errors.map((err, i) => (
            <div key={i} className="text-red-600 text-sm">{err}</div>
          ))}
        </div>
      )}
      
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={!consent || !email || !gender || age < 0 || age > 120 || isSubmitting}
          className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-[#099B9E] disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {isSubmitting ? t('emailForm.saving') : t('button.saveAndPreview')}
        </button>
        <button
          type="button"
          onClick={() => onSkip?.(subjectInfo)}
          disabled={!gender || age < 0 || age > 120 || isSubmitting}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          {t('button.preview')}
        </button>
      </div>
      
      <p className="text-xs text-gray-500 text-center">
        {t('emailForm.gdpr')} <a href="#" className="text-blue-600 hover:underline">{t('emailForm.consent.privacyLink')}</a>
      </p>
    </form>
  );
}
