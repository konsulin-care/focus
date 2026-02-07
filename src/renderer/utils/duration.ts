/**
 * F.O.C.U.S. Assessment - Duration Utility
 * 
 * Utilities for calculating test duration from test configuration.
 */

import { TestConfig } from '../types/electronAPI';

/**
 * Calculate test duration in minutes from test configuration.
 * 
 * Formula: totalTrials × (stimulusDurationMs + interstimulusIntervalMs) / 60000
 * 
 * @param config - Test configuration object
 * @returns Duration in minutes (rounded to 1 decimal place)
 */
export function calculateTestDuration(config: TestConfig): number {
  const totalMs = config.totalTrials * (config.stimulusDurationMs + config.interstimulusIntervalMs);
  const minutes = totalMs / 60000;
  return Math.round(minutes * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate test duration in milliseconds from test configuration.
 * 
 * @param config - Test configuration object
 * @returns Duration in milliseconds
 */
export function calculateTestDurationMs(config: TestConfig): number {
  return config.totalTrials * (config.stimulusDurationMs + config.interstimulusIntervalMs);
}
