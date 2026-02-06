import { useState, FormEvent } from 'react';
import { SubjectInfo } from '../types/trial';

export interface EmailCaptureFormProps {
  testData: string;  // JSON string of test events
  onSuccess: (subjectInfo: SubjectInfo) => void;
  onSkip?: (subjectInfo: SubjectInfo) => void;  // Called when user clicks Preview
}

export function EmailCaptureForm({ testData, onSuccess, onSkip }: EmailCaptureFormProps) {
  const [age, setAge] = useState<number>(0);
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subjectInfo: SubjectInfo = { age, gender: gender as 'Male' | 'Female' };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];
    
    // Age validation
    if (age < 0 || age > 120 || !Number.isInteger(age)) {
      newErrors.push('Please enter a valid age between 0 and 120');
    }
    
    // Gender validation
    if (gender !== 'Male' && gender !== 'Female') {
      newErrors.push('Please select a gender');
    }
    
    // Email validation - RFC 5322 compliant regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!email || !emailRegex.test(email)) {
      newErrors.push('Please enter a valid email address');
    }
    
    // Consent validation
    if (!consent) {
      newErrors.push('You must accept the privacy terms to receive your results');
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
      setErrors(['Failed to save. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Receive Your Results</h2>
        <p className="text-sm text-gray-600 mb-4">
          Konsulin will provide a secure access to your results through email
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              Age (years)
            </label>
            <input
              id="age"
              type="number"
              min="0"
              max="120"
              value={age || ''}
              onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white"
              placeholder="25"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white"
              disabled={isSubmitting}
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
        
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border text-gray-900 bg-white"
          placeholder="your@email.com"
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
          I consent to receive my test results at this email address. 
          My email will be securely processed and deleted after results are sent. 
          Data is retained for 7 days unless successfully transmitted.
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
          {isSubmitting ? 'Saving...' : 'Save and Preview'}
        </button>
        <button
          type="button"
          onClick={() => onSkip?.(subjectInfo)}
          disabled={!gender || age < 0 || age > 120 || isSubmitting}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          Preview
        </button>
      </div>
      
      <p className="text-xs text-gray-500 text-center">
        Your data is protected under GDPR regulations. View our{' '}
        <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a> for more information.
      </p>
    </form>
  );
}
