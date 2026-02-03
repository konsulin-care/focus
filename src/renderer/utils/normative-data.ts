/**
 * F.O.C.U.S. Assessment - Normative Reference Data
 * 
 * Utility for loading and looking up normative reference data.
 */

import normativeDataRaw from './normative-data.json';

/**
 * Normative statistics for a specific age/gender group.
 */
export interface NormativeStats {
  /** Age range or single year */
  ageRange: string;
  /** Gender (Male or Female) */
  gender: string;
  /** Sample size */
  n: number;
  /** Omission error mean percentage */
  omissionMean: number;
  /** Omission error standard deviation */
  omissionSD: number;
  /** Commission error mean percentage */
  commissionMean: number;
  /** Commission error standard deviation */
  commissionSD: number;
  /** Response time mean in milliseconds */
  responseTimeMean: number;
  /** Response time standard deviation */
  responseTimeSD: number;
  /** Response time variability mean */
  variabilityMean: number;
  /** Response time variability standard deviation */
  variabilitySD: number;
  /** D Prime mean */
  dPrimeMean: number;
  /** D Prime standard deviation */
  dPrimeSD: number;
}

// Type for JSON data
interface NormativeDataEntry {
  ageRange: string;
  gender: string;
  n: number;
  omissionMean: number;
  omissionSD: number;
  commissionMean: number;
  commissionSD: number;
  responseTimeMean: number;
  responseTimeSD: number;
  variabilityMean: number;
  variabilitySD: number;
  dPrimeMean: number;
  dPrimeSD: number;
}

/**
 * Parse age range string into [min, max] tuple.
 * @param ageRange - Age range string (e.g., "20-29", "80+", or "4")
 */
function parseAgeRange(ageRange: string): [number, number] | null {
  if (ageRange.includes('-')) {
    const [min, max] = ageRange.split('-').map(Number);
    if (!isNaN(min) && !isNaN(max)) {
      return [min, max];
    }
  } else if (ageRange.endsWith('+')) {
    const min = parseInt(ageRange.slice(0, -1), 10);
    if (!isNaN(min)) {
      return [min, 120]; // Cap at reasonable max age
    }
  } else {
    const age = parseInt(ageRange, 10);
    if (!isNaN(age)) {
      return [age, age];
    }
  }
  return null;
}

/**
 * Check if an age falls within a range.
 */
function ageInRange(age: number, ageRange: [number, number]): boolean {
  return age >= ageRange[0] && age <= ageRange[1];
}

// Parse JSON data once at module load
let normativeDataCache: NormativeStats[] | null = null;

function parseNormativeData(): NormativeStats[] {
  if (normativeDataCache) {
    return normativeDataCache;
  }

  const entries = normativeDataRaw as NormativeDataEntry[];
  
  const data: NormativeStats[] = entries.map(entry => ({
    ageRange: entry.ageRange,
    gender: entry.gender,
    n: entry.n,
    omissionMean: entry.omissionMean,
    omissionSD: entry.omissionSD,
    commissionMean: entry.commissionMean,
    commissionSD: entry.commissionSD,
    responseTimeMean: entry.responseTimeMean,
    responseTimeSD: entry.responseTimeSD,
    variabilityMean: entry.variabilityMean,
    variabilitySD: entry.variabilitySD,
    dPrimeMean: entry.dPrimeMean,
    dPrimeSD: entry.dPrimeSD,
  }));

  normativeDataCache = data;
  return data;
}

/**
 * Get normative statistics for a specific age and gender.
 * 
 * @param age - Subject age in years
 * @param gender - Subject gender ("Male" or "Female")
 * @returns NormativeStats if found, null otherwise
 */
export function getNormativeStats(age: number, gender: string): NormativeStats | null {
  const data = parseNormativeData();
  
  // Find matching record
  for (const stats of data) {
    if (stats.gender !== gender) continue;

    const range = parseAgeRange(stats.ageRange);
    if (range && ageInRange(age, range)) {
      return stats;
    }
  }

  return null;
}

/**
 * Get all available normative data entries.
 */
export function getAllNormativeData(): NormativeStats[] {
  return parseNormativeData();
}

/**
 * Check if normative data is available for a given age/gender.
 */
export function hasNormativeData(age: number, gender: string): boolean {
  return getNormativeStats(age, gender) !== null;
}
