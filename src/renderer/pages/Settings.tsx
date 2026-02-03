import { useState, useEffect } from 'react';
import { useNavigation } from '../store';
import type { TestConfig } from '../types/electronAPI';

export default function Settings() {
  const { setPage } = useNavigation();
  const [config, setConfig] = useState<TestConfig>({
    stimulusDurationMs: 100,
    interstimulusIntervalMs: 2000,
    totalTrials: 648,
    bufferMs: 500,
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    window.electronAPI.getTestConfig()
      .then(setConfig)
      .catch(() => setStatus('Failed to load settings'));
  }, []);

  const handleSave = async () => {
    try {
      await window.electronAPI.saveTestConfig(config);
      // Refetch from database to ensure UI matches persisted state
      const updatedConfig = await window.electronAPI.getTestConfig();
      setConfig(updatedConfig);
      setStatus('Settings saved successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('Failed to save settings');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleReset = async () => {
    try {
      await window.electronAPI.resetTestConfig();
      const newConfig = await window.electronAPI.getTestConfig();
      setConfig(newConfig);
      setStatus('Settings reset to defaults');
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('Failed to reset settings');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleChange = (field: keyof TestConfig, value: number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Test Configuration */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">
            Test Configuration
          </h2>
          <p className="text-gray-600 mb-4">
            Configure test parameters for the F.O.C.U.S. assessment.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stimulus Duration (ms)
              </label>
              <input
                type="number"
                value={config.stimulusDurationMs}
                onChange={(e) => handleChange('stimulusDurationMs', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="10"
                max="1000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interstimulus Interval (ms)
              </label>
              <input
                type="number"
                value={config.interstimulusIntervalMs}
                onChange={(e) => handleChange('interstimulusIntervalMs', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="100"
                max="5000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Trials
              </label>
              <input
                type="number"
                value={config.totalTrials}
                onChange={(e) => handleChange('totalTrials', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="2000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Time (ms)
              </label>
              <input
                type="number"
                value={config.bufferMs}
                onChange={(e) => handleChange('bufferMs', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="2000"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Save Settings
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Reset to Defaults
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
            Data Management
          </h2>
          <p className="text-gray-600 mb-4">
            Manage local test data and upload settings.
          </p>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              Pending Uploads: 0
            </button>
            <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              Clear Local Cache
            </button>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => setPage('home')}
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
