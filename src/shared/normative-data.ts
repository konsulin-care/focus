/**
 * F.O.C.U.S. Assessment - Normative Data
 * 
 * Shared normative values used for ACS computation and interpretation
 * in both main and renderer processes.
 */

export interface NormativeData {
  mean: number;
  stdDev: number;
}

export const NORMATIVE_VALUES: Record<string, NormativeData> = {
  'Male': {
    mean: 0.45,
    stdDev: 0.12,
  },
  'Female': {
    mean: 0.42,
    stdDev: 0.10,
  },
  'Generic': {
    mean: 0.43,
    stdDev: 0.11,
  },
};

export const ACS_INTERPRETATIONS = {
  LOW: { label: 'Low', color: 'text-red-600', threshold: -1.0 },
  AVERAGE: { label: 'Average', color: 'text-green-600', threshold: 1.0 },
  HIGH: { label: 'High', color: 'text-blue-600', threshold: Infinity },
};
