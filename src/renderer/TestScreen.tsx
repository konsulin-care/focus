import React, { useState, useEffect } from 'react';
import { useNavigation } from './store';

// TypeScript interface for the electronAPI
interface ElectronAPI {
  getEventTimestamp: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

function TestScreen() {
  const [timing, setTiming] = useState<string>('No event detected');
  const [eventType, setEventType] = useState<string>('');
  const { endTest } = useNavigation();

  useEffect(() => {
    // Handle mouse click events
    const handleClick = async (event: MouseEvent) => {
      if (event.button === 0) {
        // Left click
        try {
          const timestampNs = await window.electronAPI.getEventTimestamp();
          const timestampMs = Number(timestampNs) / 1_000_000;
          setTiming(`${timestampMs.toFixed(3)}`);
          setEventType('Left Click');
        } catch (error) {
          setTiming('Error');
          setEventType('Left Click');
        }
      }
    };

    // Handle keyboard events
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault(); // Prevent scrolling
        try {
          const timestampNs = await window.electronAPI.getEventTimestamp();
          const timestampMs = Number(timestampNs) / 1_000_000;
          setTiming(`${timestampMs.toFixed(3)}`);
          setEventType('Spacebar');
        } catch (error) {
          setTiming('Error');
          setEventType('Spacebar');
        }
      }
    };

    // Attach event listeners to window
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="bg-white h-screen flex flex-col justify-center items-center relative">
      {/* Exit Test button */}
      <button
        onClick={endTest}
        className="absolute top-4 left-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
      >
        ← Exit Test
      </button>

      {/* Test square */}
      <div className="w-[300px] h-[300px] bg-black mb-6"></div>

      {/* Debug text below the square */}
      <div className="text-center font-mono text-lg text-gray-800">
        {eventType && <div>Event Type: {eventType}</div>}
        <div>Timing: {timing} ms</div>
      </div>
    </div>
  );
}

export default TestScreen;
