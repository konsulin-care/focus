import { useState, useEffect, useCallback } from 'react';
import { StimulusType } from './types/electronAPI';
import { SubjectInfo } from './types/trial';
import { useTestPhase } from './hooks/useTestPhase';
import { useTestEvents } from './hooks/useTestEvents';
import { useTestInput } from './hooks/useTestInput';
import { useAttentionMetrics } from './hooks/useAttentionMetrics';
import { EmailCaptureForm } from './components/EmailCaptureForm';
import { TestHeader, CountdownDisplay, BufferDisplay, TrialProgress } from './components/Test';
import { StimulusContainer } from './components/Stimulus';
import { ResultsSummary } from './components/Results';

function TestScreen() {
  // Custom hooks for test logic
  const { phase, setPhase, countdown, testConfig } = useTestPhase();
  
  // Call useTestInput to enable click/spacebar responses
  const { hasResponded, recordResponse, resetResponse } = useTestInput(phase);
  
  const { 
    testEvents, 
    lastEvent, 
    elapsedTimeMs, 
    testDataJson, 
    trialCount 
  } = useTestEvents(
    useCallback(() => {
      setPhase('email-capture');
      setShowEmailCapture(true);
    }, [setPhase]),
    resetResponse  // Pass resetResponse to reset on new trial
  );
  
  const { metrics, calculateMetrics } = useAttentionMetrics(testEvents);

  // Local state for stimulus management
  const [currentStimulus, setCurrentStimulus] = useState<StimulusType | null>(null);
  const [isStimulusVisible, setIsStimulusVisible] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  // Subscribe to stimulus changes from main process (for local UI state)
  useEffect(() => {
    const unsubscribe = window.electronAPI.onStimulusChange((event) => {
      if (event.eventType === 'buffer-start') {
        setPhase('buffer');
        setIsStimulusVisible(false);
        setCurrentStimulus(null);
      } else if (event.eventType === 'stimulus-onset') {
        setCurrentStimulus(event.stimulusType);
        setIsStimulusVisible(true);
        setPhase('running');
      } else if (event.eventType === 'stimulus-offset') {
        setIsStimulusVisible(false);
      }
    });
    return () => unsubscribe();
  }, [setPhase]);

  // Stop test handler
  const handleStopTest = useCallback(async () => {
    try {
      await window.electronAPI.stopTest();
      setPhase('email-capture');
      setShowEmailCapture(true);
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  }, [setPhase]);

  // Email capture handlers
  const handleEmailCaptureSuccess = useCallback((subjectInfo: SubjectInfo) => {
    calculateMetrics(subjectInfo);
    setShowEmailCapture(false);
    setPhase('completed');
  }, [calculateMetrics, setPhase]);

  const handleEmailCaptureSkip = useCallback((subjectInfo: SubjectInfo) => {
    calculateMetrics(subjectInfo);
    setShowEmailCapture(false);
    setPhase('completed');
  }, [calculateMetrics, setPhase]);

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-black">
      <TestHeader phase={phase} onStopTest={handleStopTest} />

      {/* Countdown display */}
      {phase === 'countdown' && <CountdownDisplay countdown={countdown} />}

      {/* Buffer period display */}
      {phase === 'buffer' && <BufferDisplay />}

      {/* Trial progress */}
      {phase === 'running' && (
        <TrialProgress currentTrial={trialCount} totalTrials={testConfig.totalTrials} />
      )}

      {/* Stimulus container */}
      {phase !== 'completed' && (
        <StimulusContainer isVisible={isStimulusVisible} stimulusType={currentStimulus} />
      )}

      {/* Debug info */}
      {phase === 'running' && lastEvent && (
        <div className="mt-6 text-center font-mono text-sm text-gray-800">
          <div>Last Event: {lastEvent.eventType}</div>
          <div>Trial: {lastEvent.trialIndex}, Type: {lastEvent.stimulusType}</div>
          <div>Timestamp: {Number(lastEvent.timestampNs) / 1_000_000}ms</div>
        </div>
      )}

      {/* Results summary */}
      {phase === 'completed' && !showEmailCapture && metrics && (
        <ResultsSummary 
          metrics={metrics} 
          elapsedTimeMs={elapsedTimeMs}
        />
      )}

      {/* Email capture form overlay */}
      {showEmailCapture && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <EmailCaptureForm
            testData={testDataJson}
            onSuccess={handleEmailCaptureSuccess}
            onSkip={handleEmailCaptureSkip}
          />
        </div>
      )}
    </div>
  );
}

export default TestScreen;
