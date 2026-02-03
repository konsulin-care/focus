/**
 * F.O.C.U.S. Assessment - Timing Utilities
 * 
 * High-precision timing functions for clinical-grade measurement.
 * Uses Node.js process.hrtime.bigint() for nanosecond resolution.
 */

// ===========================================
// Math Utilities
// ===========================================

/**
 * Computes the integer square root of a BigInt using binary search.
 * @param n - The number to compute the square root of
 * @returns The integer square root of n
 */
export function bigIntSqrt(n: bigint): bigint {
  if (n < 0n) {
    throw new Error('Cannot compute square root of negative number');
  }
  
  if (n === 0n || n === 1n) {
    return n;
  }
  
  let low = 1n;
  let high = n;
  let result = 0n;
  
  while (low <= high) {
    const mid = (low + high) / 2n;
    const midSquared = mid * mid;
    
    if (midSquared === n) {
      return mid;
    } else if (midSquared < n) {
      low = mid + 1n;
      result = mid;
    } else {
      high = mid - 1n;
    }
  }
  
  return result;
}

// ===========================================
// Timing Validation
// ===========================================

/**
 * Validates the timing precision of the system using process.hrtime.bigint().
 * Measures 1000 iterations of timestamp capture and calculates mean and standard deviation.
 * 
 * @returns boolean indicating whether timing precision meets clinical requirements
 *          (standard deviation < 0.001 milliseconds)
 */
export function validateTimingPrecision(): boolean {
  const iterations = 1000;
  const measurements: bigint[] = [];

  // Capture timing measurements - time between consecutive calls to process.hrtime.bigint()
  let previousTimestamp = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    const currentTimestamp = process.hrtime.bigint();
    const delta = currentTimestamp - previousTimestamp;
    measurements.push(delta);
    previousTimestamp = currentTimestamp;
  }

  // Calculate mean (average) of measurements
  let sum = 0n;
  for (const measurement of measurements) {
    sum += measurement;
  }
  const meanNs = sum / BigInt(iterations);
  const meanMs = Number(meanNs) / 1000000;

  // Calculate standard deviation
  let sumOfSquares = 0n;
  for (const measurement of measurements) {
    const difference = measurement - meanNs;
    sumOfSquares += difference * difference;
  }
  const varianceNs = sumOfSquares / BigInt(iterations);
  const stdDevNs = bigIntSqrt(varianceNs);
  const stdDevMs = Number(stdDevNs) / 1000000;

  console.log('========================================');
  console.log('Timing Validation Results:');
  console.log('  Iterations: ' + iterations);
  console.log('  Mean: ' + meanMs.toFixed(6) + ' ms');
  console.log('  Standard Deviation: ' + stdDevMs.toFixed(6) + ' ms');
  console.log('  Clinical Requirement: standard deviation < 0.001 milliseconds (1 microsecond)');

  const passes = stdDevMs < 0.001;

  if (passes) {
    console.log('✅ Timing validation PASSED');
    console.log('  Hardware meets clinical precision requirements');
    console.log('  Standard deviation < 0.001 ms (1 microsecond)');
    console.log('========================================\n');
  } else {
    console.error('❌ Timing validation FAILED');
    console.error('  Hardware does NOT meet clinical precision requirements');
    console.error('  Required: Standard deviation < 0.001 ms (1 microsecond)');
    console.error('  Actual: Standard deviation = ' + stdDevMs.toFixed(6) + ' ms');
    console.error('========================================\n');
  }

  return passes;
}

// Run timing validation on module import
const timingValidationPassed = validateTimingPrecision();

/**
 * Whether the timing validation passed on module import.
 * Available for other modules to check without re-running validation.
 */
export const TIMING_VALIDATION_PASSED = timingValidationPassed;

// ===========================================
// High-Precision Time Functions
// ===========================================

/**
 * Get current high-precision timestamp as nanosecond bigint.
 * Wraps process.hrtime.bigint() for consistent API.
 * 
 * @returns Current timestamp as bigint (nanoseconds)
 */
export function getHighPrecisionTime(): bigint {
  return process.hrtime.bigint();
}

/**
 * Get current high-precision timestamp as string.
 * Useful for IPC communication which requires serializable types.
 * 
 * @returns Current timestamp as string
 */
export function getHighPrecisionTimeString(): string {
  return process.hrtime.bigint().toString();
}
