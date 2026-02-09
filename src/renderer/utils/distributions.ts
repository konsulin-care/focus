/**
 * F.O.C.U.S. Assessment - Probability Distributions
 * 
 * Functions for normal distribution calculations including inverse CDF
 * and cumulative distribution functions for clinical metrics.
 */

/**
 * Clamp probability to valid range for D Prime calculations.
 * Uses T.O.V.A. clinical standard boundaries: 0.00001 and 0.99999
 * This prevents numerical overflow for extreme hit/false alarm rates.
 * 
 * @param p - Probability value
 * @returns Clamped probability between 0.00001 and 0.99999
 */
export function clampProbability(p: number): number {
  return Math.max(0.00001, Math.min(0.99999, p));
}

/**
 * Abramowitz & Stegun approximation for inverse normal CDF.
 * This is the TOVA-compliant formula used in clinical practice.
 * 
 * Reference: Handbook of Mathematical Functions (Abramowitz & Stegun, 1964)
 * Equation 26.2.23
 * 
 * @param p - Probability between 0 and 1
 * @returns Z-score corresponding to the probability
 */
export function inverseNormalCDF(p: number): number {
  // Handle edge cases
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // TOVA manual: if p > 0.5, use 1-p for calculation
  const pCalc = p > 0.5 ? (1 - p) : p;

  // Calculate T = sqrt(-2 * ln(p)) per Abramowitz-Stegun
  const T = Math.sqrt(-2 * Math.log(pCalc));

  // Apply Abramowitz and Stegun approximation constants
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const numerator = c0 + c1 * T + c2 * T * T;

  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;
  const denominator = 1 + d1 * T + d2 * T * T + d3 * T * T * T;

  const z = T - numerator / denominator;

  // Sign adjustment per TOVA manual:
  // - For FA rate (p <= 0.5): zFA should be POSITIVE for low FA rate
  // - For HIT rate (p > 0.5): zHit should be NEGATIVE for high hit rate
  return p > 0.5 ? -z : z;
}

/**
 * Inverse normal cumulative distribution function using Moro's algorithm.
 * More accurate for probabilities near 0 or 1.
 * 
 * @param p - Probability between 0 and 1
 * @returns Z-score corresponding to the probability
 */
export function inverseNormalCDFMoro(p: number): number {
  // Handle edge cases
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  // Constants for Moro's algorithm
  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00
  ];
  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    // Lower tail region
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    // Central region
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    // Upper tail region
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/**
 * Standard normal cumulative distribution function.
 * Converts a z-score to its percentile (0-100).
 * Uses the error function approximation.
 * 
 * @param z - Z-score
 * @returns Percentile (0-100)
 */
export function normalCDF(z: number): number {
  // Handle edge cases
  if (z <= -6) return 0;
  if (z >= 6) return 100;
  
  // Use the error function approximation
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  const result = 0.5 * (1.0 + sign * y);
  return result * 100;
}

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
