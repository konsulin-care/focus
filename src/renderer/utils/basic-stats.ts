/**
 * F.O.C.U.S. Assessment - Basic Statistics
 * 
 * Fundamental statistical functions for calculating mean, standard deviation,
 * z-scores, and response time variability.
 */

/**
 * Calculate mean of an array of numbers.
 * 
 * @param values - Array of numbers
 * @returns Mean value
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers.
 * 
 * @param values - Array of numbers
 * @returns Standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate standard deviation with pre-computed mean (optimization).
 * 
 * @param values - Array of numbers
 * @param mean - Pre-computed mean value
 * @returns Standard deviation
 */
export function calculateStdDevWithMean(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate standard z-score.
 * 
 * @param value - The value to standardize
 * @param mean - The population mean
 * @param sd - The population standard deviation
 * @returns Z-score
 */
export function zScore(value: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - mean) / sd;
}

/**
 * Calculate response time variability (standard deviation of response times).
 * Per TOVA methodology: SD of response times for correct targets.
 * 
 * @param responseTimes - Array of response times in milliseconds
 * @param meanRT - Mean response time
 * @returns Variability as standard deviation in milliseconds
 */
export function calculateVariability(responseTimes: number[], meanRT: number): number {
  if (responseTimes.length === 0) return 0;
  const squaredDiffs = responseTimes.map(rt => Math.pow(rt - meanRT, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / responseTimes.length;
  return Math.sqrt(variance);
}
