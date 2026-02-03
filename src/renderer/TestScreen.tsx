import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from './store';
import { TestEvent, StimulusType, TestConfig, TestCompleteResult } from './types/electronAPI';
import { EmailCaptureForm } from './components/EmailCaptureForm';

type TestPhase = 'countdown' | 'buffer' | 'running' | 'completed' | 'email-capture';

function TestScreen() {
  const [phase, setPhase] = useState<TestPhase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [currentStimulus, setCurrentStimulus] = useState<StimulusType | null>(null);
  const [isStimulusVisible, setIsStimulusVisible] = useState(false);
  const [trialCount, setTrialCount] = useState(0);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    stimulusDurationMs: 100,
    interstimulusIntervalMs: 2000,
    totalTrials: 648,
    bufferMs: 500,
  });
  const [lastEvent, setLastEvent] = useState<TestEvent | null>(null);
  const [testEvents, setTestEvents] = useState<TestEvent[]>([]);
  const [testResponses, setTestResponses] = useState<TestEvent[]>([]);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [testDataJson, setTestDataJson] = useState<string>('');
  const [hasRespondedToCurrentTrial, setHasRespondedToCurrentTrial] = useState(false);
  const { endTest } = useNavigation();

  // Fetch test config on mount
  useEffect(() => {
    window.electronAPI.getTestConfig().then(setTestConfig);
  }, []);

  // Start test sequence via main process
  const startTestSequence = useCallback(async () => {
    try {
      const success = await window.electronAPI.startTest();
      if (success) {
        setPhase('running');
      }
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Start the test when countdown reaches 0
      startTestSequence();
    }
  }, [countdown, phase, startTestSequence]);

  // Subscribe to stimulus changes from main process
  useEffect(() => {
    const unsubscribeStimulus = window.electronAPI.onStimulusChange((event) => {
      setLastEvent(event);
      
      if (event.eventType === 'buffer-start') {
        // Enter buffer period - blank screen, no stimuli
        setPhase('buffer');
        setIsStimulusVisible(false);
        setCurrentStimulus(null);
        setHasRespondedToCurrentTrial(false);
      } else if (event.eventType === 'stimulus-onset') {
        setCurrentStimulus(event.stimulusType);
        setIsStimulusVisible(true);
        setTrialCount(event.trialIndex + 1);
        setPhase('running');
        setHasRespondedToCurrentTrial(false);
      } else if (event.eventType === 'stimulus-offset') {
        setIsStimulusVisible(false);
      } else if (event.eventType === 'response') {
        // Response recorded - could show feedback here
        setTestEvents(prev => [...prev, event]);
        setTestResponses(prev => [...prev, event]);
      }
    });

    const unsubscribeComplete = window.electronAPI.onTestComplete((data: TestCompleteResult) => {
      console.log('Test complete, received', data.events.length, 'events');
      
      setTestEvents(data.events);
      setTestResponses(data.events.filter(e => e.eventType === 'response'));
      setElapsedTimeMs(Number(data.elapsedTimeNs) / 1_000_000);
      
      // Store test data as JSON for email capture
      setTestDataJson(JSON.stringify(data));
      
      // Show email capture form
      setShowEmailCapture(true);
      setPhase('email-capture');
      setIsStimulusVisible(false);
      setCurrentStimulus(null);
    });

    return () => {
      unsubscribeStimulus();
      unsubscribeComplete();
    };
  }, []);

  // Handle user input (keyboard and mouse)
  useEffect(() => {
    const handleClick = async (event: MouseEvent) => {
      if (phase !== 'running') return;
      if (hasRespondedToCurrentTrial) return;
      
      // Left click is a response
      if (event.button === 0) {
        try {
          await window.electronAPI.recordResponse(true);
          setHasRespondedToCurrentTrial(true);
        } catch (error) {
          console.error('Failed to record response:', error);
        }
      }
    };

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (phase !== 'running') return;
      if (hasRespondedToCurrentTrial) return;
      
      // Spacebar is a response
      if (event.code === 'Space') {
        event.preventDefault();
        try {
          await window.electronAPI.recordResponse(true);
          setHasRespondedToCurrentTrial(true);
        } catch (error) {
          console.error('Failed to record response:', error);
        }
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, hasRespondedToCurrentTrial]);

  // Stop test handler
  const handleStopTest = useCallback(async () => {
    try {
      await window.electronAPI.stopTest();
      setPhase('email-capture');
      setShowEmailCapture(true);
      setTestDataJson(JSON.stringify({ events: testEvents, elapsedTimeNs: String(elapsedTimeMs * 1_000_000) }));
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  }, [testEvents, elapsedTimeMs]);

  // Email capture handlers
  const handleEmailCaptureSuccess = useCallback(() => {
    setShowEmailCapture(false);
    setPhase('completed');
  }, []);

  const handleEmailCaptureCancel = useCallback(() => {
    setShowEmailCapture(false);
    setPhase('completed');
  }, []);

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-black">
      {/* Exit Test button */}
      <button
        onClick={endTest}
        className="absolute top-4 left-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
      >
        ← Exit Test
      </button>

      {/* Stop Test button (when running) */}
      {phase === 'running' && (
        <button
          onClick={handleStopTest}
          className="absolute top-4 right-4 px-4 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-lg font-medium transition-colors"
        >
          Stop Test
        </button>
      )}

      {/* Countdown display */}
      {phase === 'countdown' && (
        <div className="text-white text-3xl mb-8 font-mono">
          The test will automatically start in: {countdown}
        </div>
      )}

      {/* Buffer period display */}
      {phase === 'buffer' && (
        <div className="text-gray-800 text-xl mb-4 font-mono">
          Get ready...
        </div>
      )}

      {/* Trial progress */}
      {phase === 'running' && (
        <div className="text-gray-800 text-xl mb-4 font-mono">
          Trial {trialCount} / {testConfig.totalTrials}
        </div>
      )}

      {/* Test completed message */}
      {phase === 'completed' && (
        <div className="text-white text-2xl mb-8 font-mono">
          Test Completed
        </div>
      )}

      {/* White square container - 300x300px */}
      <div className="w-[300px] h-[300px] bg-white relative border-2 border-gray-300 shadow-lg">
        {/* Target stimulus - top half center (black square 20x20) */}
        {isStimulusVisible && currentStimulus === 'target' && (
          <div
            className="absolute bg-black"
            style={{
              width: '20px',
              height: '20px',
              top: '65px',   // Top half: (150-20)/2 = 65px from top
              left: '140px', // Center: (300-20)/2 = 140px from left
            }}
          />
        )}

        {/* Non-target stimulus - bottom half center (black square 20x20) */}
        {isStimulusVisible && currentStimulus === 'non-target' && (
          <div
            className="absolute bg-black"
            style={{
              width: '20px',
              height: '20px',
              top: '215px',  // Bottom half: 150 + (150-20)/2 = 215px from top
              left: '140px', // Center: (300-20)/2 = 140px from left
            }}
          />
        )}
      </div>

      {/* Debug info - shown during test */}
      {phase === 'running' && lastEvent && (
        <div className="mt-6 text-center font-mono text-sm text-gray-800">
          <div>Last Event: {lastEvent.eventType}</div>
          <div>Trial: {lastEvent.trialIndex}, Type: {lastEvent.stimulusType}</div>
          <div>Timestamp: {Number(lastEvent.timestampNs) / 1_000_000}ms</div>
        </div>
      )}

      {/* Test completed summary */}
      {phase === 'completed' && !showEmailCapture && (
        <div className="mt-6 text-center font-mono text-lg text-white">
          <div>Total responses recorded: {testResponses.length}</div>
          <div className="mt-2">The test was completed in {Math.floor(elapsedTimeMs / 60000)}m {String(Math.floor((elapsedTimeMs % 60000) / 1000)).padStart(2, '0')}s</div>
          <div className="mt-4 text-white">
            {testResponses.length > 0 ? 'Data ready for submission' : 'No data recorded'}
          </div>
        </div>
      )}

      {/* Email capture form overlay */}
      {showEmailCapture && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <EmailCaptureForm
            testData={testDataJson}
            onSuccess={handleEmailCaptureSuccess}
            onCancel={handleEmailCaptureCancel}
          />
        </div>
      )}
    </div>
  );
}

export default TestScreen;
