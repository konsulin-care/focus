/**
 * F.O.C.U.S. Renderer Utils — Constant-Time Comparison
 *
 * Provides a timing-attack resistant string comparison function.
 * Fallback for environments where crypto.timingSafeEqual is unavailable.
 */

/**
 * Compares two strings in constant time to mitigate timing attacks.
 * Iterates through the longest string length, accumulating differences.
 *
 * Uses bitwise XOR accumulation to ensure constant execution time.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal (including equal length), false otherwise
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;
  const maxLen = Math.max(lenA, lenB);
  let diff = 0;

  // Accumulate character-by-character differences using XOR
  for (let i = 0; i < maxLen; i++) {
    const ca = i < lenA ? a.charCodeAt(i) : 0;
    const cb = i < lenB ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb; // Any difference sets a bit; OR accumulates all differences
  }

  // Also incorporate length difference into accumulator
  diff |= lenA ^ lenB;

  // If any bit was set, strings differ
  return diff === 0;
}
