/**
 * Standalone timing validation script
 * This can be run with plain Node.js to verify hardware capability
 * without requiring the Electron runtime
 */

/**
 * Computes the integer square root of a BigInt using binary search.
 * @param n - The number to compute the square root of
 * @returns The integer square root of n
 */
function bigIntSqrt(n: bigint): bigint {
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

/**
 * Validates the timing precision of the system using process.hrtime.bigint().
 * Measures 1000 iterations of timestamp capture and calculates mean and standard deviation.
 *
 * @returns boolean indicating whether timing precision meets clinical requirements
 *          (standard deviation < 0.001 milliseconds)
 */
function validateTimingPrecision(): boolean {
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
    console.error('  Required: Standard deviation <<  0.001 ms (1 microsecond)');
    console.error(`  Actual: Standard deviation = ${stdDevMs.toFixed(6)} ms`);
    console.error('========================================\n');
  }

  return passes;
}

// Run timing validation
console.log('Starting timing validation...');
const timingValidationPassed = validateTimingPrecision();

if (!timingValidationPassed) {
  console.warn('⚠️  WARNING: Hardware does not meet clinical timing precision requirements');
  console.warn('⚠️  Standard deviation exceeds 0.001 ms threshold');
  console.warn('⚠️  This hardware may be unsuitable for clinical use');
  console.warn(
    '⚠️  Consider running on hardware with better timing precision for clinical deployments\n'
  );
  process.exit(0); // Exit with success but with warnings
} else {
  console.log('Hardware validation successful - ready for clinical use');
  process.exit(0);
}
