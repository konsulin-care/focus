import { useState, FormEvent } from 'react';

export interface EmailCaptureFormProps {
  testData: string;  // JSON string of test events
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmailCaptureForm({ testData, onSuccess, onCancel }: EmailCaptureFormProps) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];
    
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
      onSuccess();
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
          Enter your email to receive a secure link to your test results
        </p>
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
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
          disabled={!consent || !email || isSubmitting}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Send My Results'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          Skip
        </button>
      </div>
      
      <p className="text-xs text-gray-500 text-center">
        Your data is protected under GDPR regulations. View our{' '}
        <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a> for more information.
      </p>
    </form>
  );
}
