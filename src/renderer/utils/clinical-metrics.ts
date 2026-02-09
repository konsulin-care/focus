/**
 * F.O.C.U.S. Assessment - Clinical Metrics
 * 
 * Clinical-specific metric functions for attention assessment.
 * These functions combine statistical distributions with clinical domain logic.
 */

import { inverseNormalCDF, clampProbability } from './distributions';

/**
 * Calculate D Prime (signal detection sensitivity measure).
 * Uses T.O.V.A. formula: D' = zFA - zHit
 * Uses Abramowitz & Stegun inverse CDF for TOVA compliance.
 * 
 * @param hitRate - Proportion of hits (0-1)
 * @param falseAlarmRate - Proportion of false alarms (0-1)
 * @returns D Prime value (higher = better perceptual sensitivity)
 */
export function calculateDPrime(hitRate: number, falseAlarmRate: number): number {
  // Apply boundary adjustments per TOVA manual
  const adjustedHitRate = clampProbability(hitRate);
  const adjustedFARate = clampProbability(falseAlarmRate);
  
  // Calculate z-scores using TOVA-compliant Abramowitz-Stegun formula
  const zHit = inverseNormalCDF(adjustedHitRate);
  const zFA = inverseNormalCDF(adjustedFARate);
  
  // T.O.V.A. formula: D' = zFA - zHit
  // Per TOVA methodology:
  // - zFA: positive for low false alarm rates
  // - zHit: negative for high hit rates
  // - D' = positive - negative = positive for good performance
  return zFA - zHit;
}
