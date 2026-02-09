/**
 * F.O.C.U.S. Assessment - Clinical Metrics
 * 
 * Clinical-specific metric functions including D Prime signal detection
 * and other attention assessment measures.
 * 
 * Uses TOVA-compliant Abramowitz & Stegun formula for inverse normal CDF.
 */

/**
 * Inverse normal cumulative distribution function per TOVA manual.
 * Uses Abramowitz & Stegun approximation formula (Equation 26.2.23 in Abramowitz & Stegun).
 * 
 * Reference: Handbook of Mathematical Functions (Abramowitz & Stegun, 1964)
 * Equation: z = T - (c0 + c1*T + c2*T^2) / (1 + d1*T + d2*T^2 + d3*T^3)
 * where T = sqrt(-ln(p)) for p <= 0.5
 * 
 * @param p - Probability between 0 and 1
 * @returns Z-score corresponding to the probability
 */
function tovaInverseNormalCDF(p: number, debug: boolean = false): number {
  // Boundary adjustments per TOVA manual
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  
  // TOVA manual: if p > 0.5, use 1-p for calculation
  const pCalc = p > 0.5 ? (1 - p) : p;
  
  // Calculate T = sqrt(-ln(p^2)) = sqrt(-2 * ln(p)) per Abramowitz-Stegun
  // This is equivalent to: T = sqrt(-2 * ln(p)) for the probability
  const T = Math.sqrt(-2 * Math.log(pCalc));
  
  // Apply Abramowitz and Stegun approximation constants
  // Numerator: c0 + c1*T + c2*T^2
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const numerator = c0 + c1 * T + c2 * T * T;
  
  // Denominator: 1 + d1*T + d2*T^2 + d3*T^3
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  const denominator = 1 + d1 * T + d2 * T * T + d3 * T * T * T;
  
  const z = T - numerator / denominator;
  
  if (debug) {
    console.log('[DEBUG] Abramowitz-Stegun:');
    console.log('[DEBUG]   Input p:', p);
    console.log('[DEBUG]   pCalc (1-p if p>0.5):', pCalc);
    console.log('[DEBUG]   T = sqrt(-ln(' + pCalc + ')):', T);
    console.log('[DEBUG]   Numerator:', numerator);
    console.log('[DEBUG]   Denominator:', denominator);
    console.log('[DEBUG]   z (before sign):', z);
  }
  
  // Sign adjustment per TOVA manual:
  // - For FA rate (p <= 0.5): zFA should be POSITIVE for low FA rate
  // - For HIT rate (p > 0.5): zHit should be NEGATIVE for high hit rate
  // - This gives D' = zFA - zHit = positive - negative = positive for good performance
  const result = p > 0.5 ? -z : z;
  
  if (debug) {
    console.log('[DEBUG]   Final z (after sign adjustment):', result);
  }
  
  return result;
}

/**
 * Calculate D Prime (signal detection sensitivity measure).
 * Uses T.O.V.A. formula: D' = zFA - zHit
 * Per TOVA manual, uses Abramowitz & Stegun inverse CDF.
 * 
 * @param hitRate - Proportion of hits (0-1)
 * @param falseAlarmRate - Proportion of false alarms (0-1)
 * @returns D Prime value (higher = better perceptual sensitivity)
 */
export function calculateDPrime(hitRate: number, falseAlarmRate: number): number {
  // Apply boundary adjustments per TOVA manual
  const adjustedHitRate = hitRate <= 0 ? 0.00001 : hitRate >= 1 ? 0.99999 : hitRate;
  const adjustedFARate = falseAlarmRate <= 0 ? 0.00001 : falseAlarmRate >= 1 ? 0.99999 : falseAlarmRate;
  
  // Calculate z-scores using TOVA-compliant Abramowitz-Stegun formula
  const zHit = tovaInverseNormalCDF(adjustedHitRate);
  const zFA = tovaInverseNormalCDF(adjustedFARate);
  
  // T.O.V.A. formula: D' = zFA - zHit
  // Per TOVA methodology:
  // - zFA: positive for low false alarm rates
  // - zHit: negative for high hit rates
  // - D' = positive - negative = positive for good performance
  // - For perfect performance: D' = 4.26 - (-4.26) = 8.52
  return zFA - zHit;
}
