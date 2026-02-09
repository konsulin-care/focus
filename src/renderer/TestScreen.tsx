import { useState, useEffect, useCallback, useRef } from 'react';
import { StimulusType } from './types/electronAPI';
import { SubjectInfo } from './types/trial';
import { useTestPhase } from './hooks/useTestPhase';
import { useTestEvents } from './hooks/useTestEvents';
import { useTestInput } from './hooks/useTestInput';
import { useAttentionMetrics } from './hooks/useAttentionMetrics';
import { useFullscreenManager } from './hooks/useFullscreenManager';
import { useNavigation } from './store';
import { EmailCaptureForm } from './components/EmailCaptureForm';
import { TestHeader, CountdownDisplay, BufferDisplay, TrialProgress } from './components/Test';
import { StimulusContainer } from './components/Stimulus';
import { ResultsSummary } from './components/Results';

function TestScreen() {
  const { endTest } = useNavigation();
  
  // Custom hooks for test logic
  const { phase, setPhase, countdown, testConfig } = useTestPhase();
  
  // Use ref to avoid circular dependency between useFullscreenManager and handleExitTest
  const exitFullscreenRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const endTestRef = useRef(() => endTest());
  
  // Update refs when functions change
  const { exitFullscreen } = useFullscreenManager(
    phase,
    useCallback(() => {
      exitFullscreenRef.current().then(() => {
        endTestRef.current();
      });
    }, [])
  );
  
  // Keep refs in sync with actual functions
  useEffect(() => {
    exitFullscreenRef.current = exitFullscreen;
    endTestRef.current = endTest;
  }, [exitFullscreen, endTest]);
  
  // Call useTestInput to enable click/spacebar responses
  const { resetResponse } = useTestInput(phase);

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
  
  const { metrics, subjectInfo, calculateMetrics } = useAttentionMetrics(testEvents);

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
    <div className="h-screen flex flex-col justify-center items-center bg-black" style={{ cursor: phase === 'running' ? 'none' : 'default' }}>
      <TestHeader phase={phase} onExitTest={endTest} />

      {/* Countdown display */}
      {phase === 'countdown' && <CountdownDisplay countdown={countdown} />}

      {/* Buffer period display */}
      {phase === 'buffer' && <BufferDisplay countdown={countdown} />}

      {/* Trial progress */}
      {phase === 'running' && (
        <TrialProgress currentTrial={trialCount} totalTrials={testConfig.totalTrials} />
      )}

      {/* Stimulus container - hidden during countdown */}
      {phase !== 'completed' && phase !== 'countdown' && (
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
      {phase === 'completed' && !showEmailCapture && metrics && subjectInfo && (
        <ResultsSummary 
          metrics={metrics} 
          elapsedTimeMs={elapsedTimeMs}
          testEvents={testEvents}
          subjectInfo={subjectInfo}
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
