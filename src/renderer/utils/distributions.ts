/**
 * F.O.C.U.S. Clinical Attention Test - Probability Distributions
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
 * Inverse normal cumulative distribution function (quantile function).
 * Uses the Beasley-Springer-Moro algorithm for approximation.
 * 
 * @param p - Probability between 0 and 1
 * @returns Z-score corresponding to the probability
 */
export function inverseNormalCDF(p: number): number {
  // Handle edge cases
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Constants for Beasley-Springer-Moro algorithm
  const a0 = 2.50662823884;
  const a1 = -18.61500062529;
  const a2 = 41.39119773534;
  const a3 = -25.44106049637;
  const b0 = -8.47351093090;
  const b1 = 23.08336743743;
  const b2 = -21.06224101826;
  const b3 = 3.13082909833;
  const c0 = -2.78718931138;
  const c1 = -2.29796479134;
  const c2 = 4.85014127135;
  const c3 = 2.32121276858;
  const d0 = 4.36977536806e-02;
  const d1 = 1.23173951645e-01;
  const d2 = -3.54388924762e-01;
  const d3 = 7.37046012451e-02;

  let q = p - 0.5;
  let r: number;

  if (Math.abs(q) <= 0.42) {
    // Use rational approximation for central region
    r = q * q;
    return q * (((a3 * r + a2) * r + a1) * r + a0) /
           ((((b3 * r + b2) * r + b1) * r + b0) * r + 1);
  } else {
    // Use rational approximation for tails
    r = p;
    if (q > 0) r = 1 - p;
    r = Math.sqrt(-Math.log(r));
    
    let result = (((c3 * r + c2) * r + c1) * r + c0) /
                 ((((d3 * r + d2) * r + d1) * r + d0) * r + 1);
    
    if (q < 0) result = -result;
    return result;
  }
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
