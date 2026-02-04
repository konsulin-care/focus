/**
 * F.O.C.U.S. Assessment - Trial Sequence Generator
 * 
 * Stateless module for generating randomized trial sequences
 * with the two-half ratio system.
 * 
 * First half: 22.5% targets, 77.5% non-targets
 * Second half: 77.5% targets, 22.5% non-targets
 */

import { StimulusType } from './types';

/**
 * Fisher-Yates shuffle algorithm for randomizing arrays in-place.
 * 
 * @param array - Array to shuffle
 */
export function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Generate randomized trial sequence with two-half ratio system.
 * First half: 22.5% targets, 77.5% non-targets
 * Second half: 77.5% targets, 22.5% non-targets
 * 
 * @param totalTrials - Total number of trials (must be positive even integer)
 * @returns Array of stimulus types for the full sequence
 * @throws Error if totalTrials is not a positive integer or cannot be normalized to even
 */
export function generateTrialSequence(totalTrials: number): StimulusType[] {
  // Validate totalTrials is a positive integer
  if (!Number.isInteger(totalTrials) || totalTrials <= 0) {
    throw new Error(`totalTrials must be a positive integer, got ${totalTrials}`);
  }
  
  // Ensure even number of trials (required for two-half ratio system)
  const normalizedTrials = totalTrials % 2 === 0 ? totalTrials : totalTrials + 1;
  
  if (normalizedTrials !== totalTrials) {
    console.warn(`generateTrialSequence: totalTrials ${totalTrials} is odd, rounded up to ${normalizedTrials} for even distribution`);
  }
  
  const halfTrials = normalizedTrials / 2; // Now guaranteed to be integer
  
  // First half: 22.5% targets
  const firstHalfTargets = Math.round(halfTrials * 0.225);
  const firstHalfNonTargets = halfTrials - firstHalfTargets;
  
  // Second half: 77.5% targets
  const secondHalfTargets = Math.round(halfTrials * 0.775);
  const secondHalfNonTargets = halfTrials - secondHalfTargets;
  
  // Build arrays with validated integer lengths
  const firstHalf: StimulusType[] = [
    ...Array(firstHalfTargets).fill('target'),
    ...Array(firstHalfNonTargets).fill('non-target'),
  ];
  
  const secondHalf: StimulusType[] = [
    ...Array(secondHalfTargets).fill('target'),
    ...Array(secondHalfNonTargets).fill('non-target'),
  ];
  
  // Shuffle each half independently to preserve ratio within each half
  shuffleArray(firstHalf);
  shuffleArray(secondHalf);
  
  // Combine: first half + second half
  return [...firstHalf, ...secondHalf];
}

/**
 * TrialSequenceGenerator interface for dependency injection.
 */
export interface TrialSequenceGenerator {
  generate(totalTrials: number): StimulusType[];
}

/**
 * Default trial sequence generator instance.
 */
export const trialSequenceGenerator: TrialSequenceGenerator = {
  generate: generateTrialSequence
};
