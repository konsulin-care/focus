import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../store';
import type { TestConfig } from '../types/electronAPI';

export default function Settings() {
  const { t } = useTranslation();
  const { setPage } = useNavigation();
  const [config, setConfig] = useState<TestConfig>({
    stimulusDurationMs: 100,
    interstimulusIntervalMs: 2000,
    totalTrials: 648,
    bufferMs: 500,
  });
  const [status, setStatus] = useState('');
  const [isTotalTrialsFocused, setIsTotalTrialsFocused] = useState(false);
  const [editingValue, setEditingValue] = useState<string>('');

  // Show raw value when focused and editing, otherwise show normalized
  const displayTotalTrials = isTotalTrialsFocused && editingValue !== ''
    ? editingValue
    : config.totalTrials % 2 === 0 
      ? config.totalTrials 
      : config.totalTrials + 1;

  // Show warning when normalization would occur AND field is not focused
  const showNormalizationWarning = !isTotalTrialsFocused &&
                                    config.totalTrials >= 2 &&
                                    config.totalTrials % 2 !== 0;

  useEffect(() => {
    window.electronAPI.getTestConfig()
      .then(setConfig)
      .catch(() => setStatus(t('status.loadFailed')));
  }, []);

  const handleSave = async () => {
    try {
      // Normalize totalTrials on save
      const normalized = config.totalTrials % 2 === 0 
        ? config.totalTrials 
        : config.totalTrials + 1;
      const configToSave = { ...config, totalTrials: normalized };
      await window.electronAPI.saveTestConfig(configToSave);
      // Refetch from database to ensure UI matches persisted state
      const updatedConfig = await window.electronAPI.getTestConfig();
      setConfig(updatedConfig);
      setStatus(t('status.saveSuccess'));
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus(t('status.saveFailed'));
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleReset = async () => {
    try {
      await window.electronAPI.resetTestConfig();
      const newConfig = await window.electronAPI.getTestConfig();
      setConfig(newConfig);
      setStatus(t('status.resetSuccess'));
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus(t('status.resetFailed'));
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleChange = (field: keyof TestConfig, value: number) => {
    if (field === 'totalTrials') {
      // Store raw value while typing, normalize on blur
      setConfig(prev => ({ ...prev, [field]: Math.max(2, parseInt(String(value)) || 2) }));
    } else {
      setConfig(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleTotalTrialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
    const num = parseInt(e.target.value) || 2;
    setConfig(prev => ({ ...prev, totalTrials: Math.max(2, num) }));
  };

  const handleTotalTrialsBlur = useCallback(() => {
    setIsTotalTrialsFocused(false);
    
    let value = config.totalTrials;
    if (!Number.isInteger(value) || value < 2) {
      value = 2;
    } else if (value % 2 !== 0) {
      value = value + 1;
    }
    
    setEditingValue('');
    setConfig(prev => ({ ...prev, totalTrials: value }));
  }, [config.totalTrials]);

  const handleTotalTrialsFocus = () => {
    setIsTotalTrialsFocused(true);
    setEditingValue(String(config.totalTrials));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        {t('settings.title')}
      </h1>

      <div className="space-y-6">
        {/* Test Configuration */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">
            {t('settings.timing.title')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('settings.timing.configDescription')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.timing.stimulusDuration')}
              </label>
              <input
                type="number"
                value={config.stimulusDurationMs}
                onChange={(e) => handleChange('stimulusDurationMs', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                min="10"
                max="1000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.timing.interstimulusInterval')}
              </label>
              <input
                type="number"
                value={config.interstimulusIntervalMs}
                onChange={(e) => handleChange('interstimulusIntervalMs', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                min="100"
                max="5000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.timing.totalTrials')}
              </label>
              <input
                type="number"
                value={displayTotalTrials}
                onChange={handleTotalTrialsChange}
                onFocus={handleTotalTrialsFocus}
                onBlur={handleTotalTrialsBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('settings.timing.totalTrialsDescription')}
              </p>
              {showNormalizationWarning && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t('settings.timing.oddValuesRounded', { value: displayTotalTrials })}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.timing.bufferTime')}
              </label>
              <input
                type="number"
                value={config.bufferMs}
                onChange={(e) => handleChange('bufferMs', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                min="0"
                max="2000"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#099B9E] transition-colors cursor-pointer"
            >
              {t('button.saveSettings')}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
            >
              {t('button.resetDefaults')}
            </button>
          </div>
          
          {status && (
            <p className={`mt-3 text-sm ${status.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {status}
            </p>
          )}
        </div>

        {/* Data Management */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">
            {t('settings.dataManagement.title')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('settings.dataManagement.description')}
          </p>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              {t('settings.dataManagement.pendingUploads', { count: 0 })}
            </button>
            <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              {t('settings.dataManagement.clearCache')}
            </button>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => setPage('home')}
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
        >
          {t('button.backToHome')}
        </button>
      </div>
    </div>
  );
}
