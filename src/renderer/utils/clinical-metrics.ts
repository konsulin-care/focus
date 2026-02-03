/**
 * F.O.C.U.S. Clinical Attention Test - Clinical Metrics
 * 
 * Clinical-specific metric functions including D Prime signal detection
 * and other attention assessment measures.
 */

import { inverseNormalCDF, clampProbability } from './distributions';

/**
 * Calculate D Prime (signal detection sensitivity measure).
 * Uses T.O.V.A. formula: D' = zFA - zHit
 * 
 * @param hitRate - Proportion of hits (0-1, clamped)
 * @param falseAlarmRate - Proportion of false alarms (0-1, clamped)
 * @returns D Prime value (higher = better perceptual sensitivity)
 */
export function calculateDPrime(hitRate: number, falseAlarmRate: number): number {
  const clampedHitRate = clampProbability(hitRate);
  const clampedFARate = clampProbability(falseAlarmRate);
  const zHit = inverseNormalCDF(clampedHitRate);
  const zFA = inverseNormalCDF(clampedFARate);
  // T.O.V.A. formula: D' = zFA - zHit
  return zFA - zHit;
}
