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
 * @param totalTrials - Total number of trials
 * @returns Array of stimulus types for the full sequence
 */
export function generateTrialSequence(totalTrials: number): StimulusType[] {
  const halfTrials = totalTrials / 2;
  
  // First half: 22.5% targets
  const firstHalfTargets = Math.round(halfTrials * 0.225);
  const firstHalfNonTargets = halfTrials - firstHalfTargets;
  
  // Second half: 77.5% targets
  const secondHalfTargets = Math.round(halfTrials * 0.775);
  const secondHalfNonTargets = halfTrials - secondHalfTargets;
  
  // Build arrays
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
