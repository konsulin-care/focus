/**
 * F.O.C.U.S. Assessment - Probability Distributions
 *
 * Functions for normal distribution calculations including inverse CDF
 * and cumulative distribution functions.
 *
 * This module contains PURE statistical functions only.
 * For clinical metrics that combine these functions, use ./clinical-metrics
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
export function inverseNormalCDF(probability: number): number {
  // Handle edge cases
  if (probability <= 0) return -Infinity;
  if (probability >= 1) return Infinity;
  if (probability === 0.5) return 0;

  // TOVA manual: if p > 0.5, use 1-p for calculation
  const adjustedProbability = probability > 0.5 ? 1 - probability : probability;

  // Calculate T = sqrt(-2 * ln(p)) per Abramowitz-Stegun
  const sqrtTerm = Math.sqrt(-2 * Math.log(adjustedProbability));

  // Apply Abramowitz and Stegun approximation constants
  const coeffA0 = 2.515517;
  const coeffA1 = 0.802853;
  const coeffA2 = 0.010328;
  const numerator = coeffA0 + coeffA1 * sqrtTerm + coeffA2 * sqrtTerm * sqrtTerm;

  const coeffB1 = 1.432788;
  const coeffB2 = 0.189269;
  const coeffB3 = 0.001308;
  const denominator =
    1 +
    coeffB1 * sqrtTerm +
    coeffB2 * sqrtTerm * sqrtTerm +
    coeffB3 * sqrtTerm * sqrtTerm * sqrtTerm;

  const zScore = sqrtTerm - numerator / denominator;

  // Sign adjustment per TOVA manual:
  // - For FA rate (p <= 0.5): zFA should be POSITIVE for low FA rate
  // - For HIT rate (p > 0.5): zHit should be NEGATIVE for high hit rate
  return probability > 0.5 ? -zScore : zScore;
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

  // Coefficients for Moro's inverse normal CDF algorithm
  const coeffA = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const coeffB = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const coeffC = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const coeffD = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pLow = 0.02425; // Lower tail threshold
  const pHigh = 1 - pLow; // Upper tail threshold

  let q: number, r: number;

  if (p < pLow) {
    // Lower tail region
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((coeffC[0] * q + coeffC[1]) * q + coeffC[2]) * q + coeffC[3]) * q + coeffC[4]) * q +
        coeffC[5]) /
      ((((coeffD[0] * q + coeffD[1]) * q + coeffD[2]) * q + coeffD[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    // Central region
    q = p - 0.5;
    r = q * q;
    return (
      ((((((coeffA[0] * r + coeffA[1]) * r + coeffA[2]) * r + coeffA[3]) * r + coeffA[4]) * r +
        coeffA[5]) *
        q) /
      (((((coeffB[0] * r + coeffB[1]) * r + coeffB[2]) * r + coeffB[3]) * r + coeffB[4]) * r + 1)
    );
  } else {
    // Upper tail region
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(
        ((((coeffC[0] * q + coeffC[1]) * q + coeffC[2]) * q + coeffC[3]) * q + coeffC[4]) * q +
        coeffC[5]
      ) /
      ((((coeffD[0] * q + coeffD[1]) * q + coeffD[2]) * q + coeffD[3]) * q + 1)
    );
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
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erfParam = 0.3275911; // Parameter for error function approximation

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + erfParam * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  const result = 0.5 * (1.0 + sign * y);
  return result * 100;
}
