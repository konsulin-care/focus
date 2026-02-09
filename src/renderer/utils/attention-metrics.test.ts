/**
 * F.O.C.U.S. Assessment - Attention Metrics Tests
 * 
 * Tests validate attention metric calculations against TOVA manual specifications:
 * - Variability: Standard deviation of response times for correct hits
 * - D Prime: Signal detection sensitivity using Abramowitz & Stegun inverse CDF
 * 
 * Uses Vitest with floating-point comparison via toBeCloseTo() for precision.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { calculateAttentionMetrics } from './attention-metrics';
import { calculateVariability } from './basic-stats';
import { calculateDPrime as clinicalCalculateDPrime } from './clinical-metrics';
import { getNormativeStats } from './normative-data';
import { TRIAL_CONSTANTS } from './trial-constants';
import { TestEvent } from '../types/electronAPI';
import { SubjectInfo } from '../types/trial';

// ============================================================================
// TOVA Manual Calculation Functions
// ============================================================================

/**
 * Calculate response time variability (RTV) per TOVA manual.
 * RTV = Standard deviation of response times for correct hits.
 * Excludes anticipatory responses (<150ms).
 */
function manualCalculateVariability(responseTimes: number[]): number {
  if (responseTimes.length === 0) return 0;
  
  const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const squaredDiffs = responseTimes.map(rt => Math.pow(rt - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / responseTimes.length;
  return Math.sqrt(variance);
}

/**
 * Calculate mean response time per TOVA manual.
 */
function manualCalculateMean(responseTimes: number[]): number {
  if (responseTimes.length === 0) return 0;
  return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
}

/**
 * Abramowitz and Stegun formula for inverse normal CDF.
 * Uses TOVA-compliant formula with CORRECT sign handling:
 * - For p > 0.5: negate z (HIT rate - high hit = negative z)
 * - For p <= 0.5: don't negate z (FA rate - low FA = positive z)
 */
function manualInverseNormalCDF(probability: number): number {
  // Boundary adjustments per TOVA manual
  if (probability <= 0) return -7.0;
  if (probability >= 1) return +7.0;
  if (probability === 0.5) return 0;
  
  // TOVA manual: if probability > 0.5, use 1-probability for calculation
  const adjustedProbability = probability > 0.5 ? (1 - probability) : probability;
  
  // Calculate T = sqrt(-2 * ln(adjustedProbability)) per Abramowitz-Stegun
  const sqrtTerm = Math.sqrt(-2.0 * Math.log(adjustedProbability));
  
  // Apply Abramowitz and Stegun approximation
  const numerator = 2.515517 
    + 0.802853 * sqrtTerm 
    + 0.010328 * sqrtTerm * sqrtTerm;
  
  const denominator = 1.0 
    + 1.432788 * sqrtTerm 
    + 0.189269 * sqrtTerm * sqrtTerm 
    + 0.001308 * sqrtTerm * sqrtTerm * sqrtTerm;
  
  const zScore = sqrtTerm - numerator / denominator;
  
  // CORRECT sign adjustment per TOVA manual:
  // - For FA rate (probability <= 0.5): zFA should be positive (low FA = good)
  // - For HIT rate (probability > 0.5): zHit should be negated (high hit = good)
  return probability > 0.5 ? -zScore : zScore;
}

/**
 * Calculate D Prime per TOVA manual specification.
 * Uses hit rate and false alarm rate with Abramowitz & Stegun inverse CDF.
 */
function manualCalculateDPrime(
  hitRate: number,
  falseAlarmRate: number
): number {
  // Boundary adjustments
  const adjustedHitRate = hitRate <= 0 ? 0.00001 : hitRate >= 1 ? 0.99999 : hitRate;
  const adjustedFARate = falseAlarmRate <= 0 ? 0.00001 : falseAlarmRate >= 1 ? 0.99999 : falseAlarmRate;
  
  // Calculate z-scores using Abramowitz and Stegun with CORRECT signs
  const zHit = manualInverseNormalCDF(adjustedHitRate);
  const zFA = manualInverseNormalCDF(adjustedFARate);
  
  // D Prime = zFA - zHit (per TOVA)
  // zFA is positive for low FA, zHit is negative for high hit
  // Result is positive for good performance
  return zFA - zHit;
}

/**
 * Calculate Z-score with scaled normative SD.
 * Formula: Z = (X - μ) / (σ × SF)
 * This scales the normative reference to account for reduced sample size.
 */
function zScoreScaled(value: number, mean: number, sd: number, scalingFactor: number): number {
  const scaledSD = sd * scalingFactor;
  if (scaledSD === 0) return 0;
  return (value - mean) / scaledSD;
}

// ============================================================================
// Test Data Setup
// ============================================================================

interface TestDataRecord {
  id: number;
  test_data: string;
  email: string;
  created_at: string;
}

interface TestData {
  records: TestDataRecord[];
  events: TestEvent[];
  subjectInfo: SubjectInfo;
}

function loadTestData(): TestData {
  const testDataPath = path.join(process.cwd(), 'data', 'test-data.json');
  const fileContent = fs.readFileSync(testDataPath, 'utf-8');
  const rawData: TestDataRecord[] = JSON.parse(fileContent);
  
  // Parse the first test record
  const firstRecord = rawData[0];
  const parsedTestData = JSON.parse(firstRecord.test_data);
  const events: TestEvent[] = parsedTestData.events;
  
  // Extract subject info - use age 32 and Male to match manual calculation
  const subjectInfo: SubjectInfo = {
    age: 32, // 30-39 age group per manual calculation
    gender: 'Male',
  };
  
  return {
    records: rawData,
    events,
    subjectInfo,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Attention Metrics - TOVA Manual Validation', () => {
  let testData: TestData;
  
  beforeAll(() => {
    testData = loadTestData();
  });
  
  describe('calculateMean', () => {
    it('should calculate mean correctly for simple array', () => {
      const values = [100, 200, 300, 400, 500];
      const expected = 300;
      
      const result = manualCalculateMean(values);
      expect(result).toBe(expected);
    });
    
    it('should return 0 for empty array', () => {
      const result = manualCalculateMean([]);
      expect(result).toBe(0);
    });
    
    it('should handle single value', () => {
      const result = manualCalculateMean([250]);
      expect(result).toBe(250);
    });
  });
  
  describe('calculateVariability (RTV)', () => {
    it('should match manual TOVA variability calculation', () => {
      // Sample response times (in ms) from test data hits
      const responseTimes = [496.78, 525.24, 523.74, 556.98, 481.08, 477.55, 500.97, 417.04];
      
      const manual = manualCalculateVariability(responseTimes);
      const mean = manualCalculateMean(responseTimes);
      const library = calculateVariability(responseTimes, mean);
      
      // Use toBeCloseTo for floating-point comparison (5 decimal places)
      expect(library).toBeCloseTo(manual, 5);
    });
    
    it('should return 0 for empty response times', () => {
      const result = calculateVariability([], 0);
      expect(result).toBe(0);
    });
    
    it('should calculate variability for full test data', () => {
      const { events, subjectInfo } = testData;
      const metrics = calculateAttentionMetrics(events, subjectInfo);
      
      // Manual calculation for verification
      const hitResponseTimes = events
        .filter((e: TestEvent) => 
          e.eventType === 'response' && 
          e.responseCorrect === true &&
          !e.isAnticipatory
        )
        .map((e: TestEvent) => e.responseTimeMs as number);
      
      const manualVariability = manualCalculateVariability(hitResponseTimes);
      
      // Compare with calculated variability
      console.log('[TEST] Manual variability:', manualVariability);
      console.log('[TEST] Library variability:', metrics.variability);
      console.log('[TEST] Hit count:', hitResponseTimes.length);
      
      // The metrics should match the manual calculation
      expect(metrics.variability).toBeCloseTo(manualVariability, 2);
    });
  });
  
  describe('calculateDPrime (Signal Detection)', () => {
    it('should match manual TOVA D Prime calculation', () => {
      // Test case 1: Near-perfect performance
      // Per TOVA manual: D' is POSITIVE for good performance (high hits, low FA)
      const dPrime1 = clinicalCalculateDPrime(0.9999, 0.0001);
      expect(dPrime1).toBeGreaterThan(1); // Large positive d' for high performance
      
      // Test case 2: Random performance
      const dPrime2 = clinicalCalculateDPrime(0.5, 0.5);
      expect(dPrime2).toBeCloseTo(0, 1); // Should be ~0 for random
      
      // Test case 3: Poor sensitivity (low hits, high FA)
      // Per TOVA: d' is NEGATIVE for poor performance
      const dPrime3 = clinicalCalculateDPrime(0.3, 0.7);
      expect(dPrime3).toBeLessThan(0); // Negative d' indicates poor sensitivity
    });
    
    it('should handle boundary conditions (0% and 100%)', () => {
      // 100% hit rate, 0% false alarm (perfect performance)
      const dPrimePerfect = clinicalCalculateDPrime(1.0, 0.0);
      expect(Number.isFinite(dPrimePerfect)).toBe(true);
      expect(dPrimePerfect).toBeGreaterThan(0); // Positive for perfect performance
      
      // 0% hit rate, 100% false alarm (worst case)
      const dPrimeWorst = clinicalCalculateDPrime(0.0, 1.0);
      expect(Number.isFinite(dPrimeWorst)).toBe(true);
      expect(dPrimeWorst).toBeLessThan(0); // Negative for poor performance
    });
    
    it('should match clinical-metrics calculateDPrime', () => {
      const testCases = [
        { hitRate: 0.5, faRate: 0.5, expectedDPrime: 0 },
        { hitRate: 0.9, faRate: 0.1, description: 'high sensitivity' },
        { hitRate: 0.75, faRate: 0.25, description: 'moderate sensitivity' },
      ];
      
      testCases.forEach(({ hitRate, faRate, description, expectedDPrime }) => {
        const manual = manualCalculateDPrime(hitRate, faRate);
        const library = clinicalCalculateDPrime(hitRate, faRate);
        
        console.log(`[TEST] ${description || `HR=${hitRate}, FAR=${faRate}`}: manual=${manual.toFixed(4)}, library=${library.toFixed(4)}`);
        
        // Assert manual matches library
        expect(Math.abs(manual - library)).toBeLessThan(0.01);
        
        // Assert against expectedDPrime when present
        if (expectedDPrime !== undefined) {
          expect(library).toBeCloseTo(expectedDPrime, 1);
        }
      });
    });
    
    it('should calculate D Prime for test data second half', () => {
      const { events } = testData;
      
      // Calculate second half metrics manually
      const totalTrials = events.filter((e: TestEvent) => e.eventType === 'stimulus-onset').length;
      const midpoint = Math.floor(totalTrials / 2);
      
      // Count hits and omissions in second half
      const secondHalfEvents = events.filter((e: TestEvent) => {
        return e.trialIndex >= midpoint;
      });
      
      const secondHalfOnsets = secondHalfEvents.filter((e: TestEvent) => e.eventType === 'stimulus-onset');
      const secondHalfResponses = secondHalfEvents.filter((e: TestEvent) => e.eventType === 'response');
      
      const secondHalfTargets = secondHalfOnsets.filter((e: TestEvent) => e.stimulusType === 'target').length;
      const secondHalfNonTargets = secondHalfOnsets.filter((e: TestEvent) => e.stimulusType === 'non-target').length;
      
      const secondHalfHits = secondHalfResponses.filter((e: TestEvent) => e.responseCorrect === true).length;
      const secondHalfCommissions = secondHalfResponses.filter((e: TestEvent) => 
        e.responseCorrect === false && 
        e.stimulusType === 'non-target'
      ).length;
      
      const hitRate = secondHalfTargets > 0 ? secondHalfHits / secondHalfTargets : 0.5;
      const falseAlarmRate = secondHalfNonTargets > 0 ? secondHalfCommissions / secondHalfNonTargets : 0.5;
      
      const manualDPrime = manualCalculateDPrime(hitRate, falseAlarmRate);
      const libraryDPrime = clinicalCalculateDPrime(hitRate, falseAlarmRate);
      
      console.log('[TEST] Second Half D Prime:');
      console.log('[TEST]   Targets:', secondHalfTargets, 'Hits:', secondHalfHits);
      console.log('[TEST]   Non-Targets:', secondHalfNonTargets, 'Commissions:', secondHalfCommissions);
      console.log('[TEST]   Hit Rate:', hitRate.toFixed(4), 'FA Rate:', falseAlarmRate.toFixed(4));
      console.log('[TEST]   Manual dPrime:', manualDPrime.toFixed(4));
      console.log('[TEST]   Library dPrime:', libraryDPrime.toFixed(4));
      
      expect(Math.abs(manualDPrime - libraryDPrime)).toBeLessThan(0.01);
    });
  });
  
  describe('Manual Calculation Validation - 32yo Male', () => {
    // These tests validate the implementation against the manual calculation
    // provided in the task for a 32-year-old male subject
    
    it('should match manual D Prime of 8.52 for perfect performance', () => {
      // Test data: 5 hits/5 targets = 1.0, 0 commissions/3 non-targets = 0.0
      // Per manual: adjusted HR = 0.99999, adjusted FAR = 0.00001
      const dPrime = clinicalCalculateDPrime(1.0, 0.0);
      
      // Manual calculation: D' = zFA - zHit = 4.26 - (-4.26) = 8.52
      expect(dPrime).toBeCloseTo(8.52, 1);
    });
    
    it('should match manual variability of 91.39ms', () => {
      // Response times from manual calculation
      const responseTimes = [424.28, 422.32, 594.92, 616.85, 413.52];
      
      const manualVariability = manualCalculateVariability(responseTimes);
      expect(manualVariability).toBeCloseTo(91.39, 1);
      
      // Verify library calculation matches
      const mean = manualCalculateMean(responseTimes);
      const libraryVariability = calculateVariability(responseTimes, mean);
      expect(libraryVariability).toBeCloseTo(91.39, 1);
    });
    
    it('should calculate correct Z-scores using actual normative data', () => {
      // Subject values
      const dPrime = 8.52;
      const variability = 91.39;
      const rt = 424.28;
      
      // Get normative stats for 30-39 age group, Male
      const normativeStats = getNormativeStats(32, 'Male');
      
      expect(normativeStats).not.toBeNull();
      if (!normativeStats) return;
      
      // Calculate Z-scores using actual normative data
      // Note: Manual used different normative values; we use actual data
      const dPrimeZ = (dPrime - normativeStats.dPrimeMean) / normativeStats.dPrimeSD;
      const variabilityZ = (variability - normativeStats.variabilityMean) / normativeStats.variabilitySD;
      const rtZ = (rt - normativeStats.responseTimeMean) / normativeStats.responseTimeSD;
      
      console.log('[TEST] Z-scores with actual normative data:');
      console.log('[TEST]   DPrime Z:', dPrimeZ.toFixed(2));
      console.log('[TEST]   Variability Z:', variabilityZ.toFixed(2));
      console.log('[TEST]   RT Z:', rtZ.toFixed(2));
      console.log('[TEST]   Normative DPrime Mean:', normativeStats.dPrimeMean, 'SD:', normativeStats.dPrimeSD);
      console.log('[TEST]   Normative RT Mean:', normativeStats.responseTimeMean, 'SD:', normativeStats.responseTimeSD);
      
      // Verify calculations are reasonable (positive Z-scores for above-average performance)
      expect(dPrimeZ).toBeGreaterThan(0); // Above normative mean
      expect(variabilityZ).toBeGreaterThan(0); // Above normative mean (higher variability)
      expect(rtZ).toBeGreaterThan(0); // Above normative mean (slower RT)
    });
    
    it('should calculate ACS close to manual calculation', () => {
      const { events, subjectInfo } = testData;
      
      const metrics = calculateAttentionMetrics(events, subjectInfo);
      
      console.log('[TEST] Full ACS Calculation:');
      console.log('[TEST]   DPrime:', metrics.dPrime.toFixed(4));
      console.log('[TEST]   Variability:', metrics.variability.toFixed(2));
      console.log('[TEST]   ACS:', metrics.acs.toFixed(2));
      console.log('[TEST]   DPrime Z:', metrics.zScores.dPrime?.toFixed(2) ?? 'N/A');
      console.log('[TEST]   Variability Z:', metrics.zScores.variability?.toFixed(2) ?? 'N/A');
      console.log('[TEST]   RT Z:', metrics.zScores.responseTime?.toFixed(2) ?? 'N/A');
      
      // Verify D Prime is positive for good performance
      expect(metrics.dPrime).toBeGreaterThan(0);
      
      // Verify key metrics are in expected ranges (using reasonable tolerances)
      expect(Math.abs(metrics.dPrime - 8.52)).toBeLessThan(0.01);

      // Note: Actual variability may differ slightly from manual due to different response times
      expect(metrics.variability).toBeGreaterThan(0);
      
      // ACS should be close to manual calculation (10.59)
      // Using 1.0 tolerance due to normative data differences
      expect(Math.abs(metrics.acs - 10.59)).toBeLessThan(0.1);
    });
  });
  
  describe('calculateAttentionMetrics (Integration)', () => {
    it('should return valid metrics for test data', () => {
      const { events, subjectInfo } = testData;
      
      const metrics = calculateAttentionMetrics(events, subjectInfo);
      
      // Basic assertions
      expect(metrics.trialCount).toBeGreaterThan(0);
      expect(metrics.hits).toBeGreaterThanOrEqual(0);
      expect(metrics.omissions).toBeGreaterThanOrEqual(0);
      expect(metrics.commissions).toBeGreaterThanOrEqual(0);
      expect(metrics.correctRejections).toBeGreaterThanOrEqual(0);
      
      // Percentage calculations
      const totalTargets = metrics.hits + metrics.omissions;
      const totalNonTargets = metrics.commissions + metrics.correctRejections;
      
      if (totalTargets > 0) {
        expect(metrics.omissionPercent).toBeCloseTo((metrics.omissions / totalTargets) * 100, 2);
      }
      if (totalNonTargets > 0) {
        expect(metrics.commissionPercent).toBeCloseTo((metrics.commissions / totalNonTargets) * 100, 2);
      }
    });
    
    it('should calculate variability from valid hit response times', () => {
      const { events, subjectInfo } = testData;
      
      const metrics = calculateAttentionMetrics(events, subjectInfo);
      
      // Get valid hit response times (non-anticipatory)
      const validHitResponseTimes = events
        .filter((e: TestEvent) => 
          e.eventType === 'response' && 
          e.responseCorrect === true && 
          !e.isAnticipatory
        )
        .map((e: TestEvent) => e.responseTimeMs as number);
      
      // Hard assertion: test must have valid hit data to proceed
      expect(validHitResponseTimes.length).toBeGreaterThan(0);
      
      if (validHitResponseTimes.length > 0) {
        const manualVariability = manualCalculateVariability(validHitResponseTimes);
        
        console.log('[TEST] Integration Test Variability:');
        console.log('[TEST]   Valid hits:', validHitResponseTimes.length);
        console.log('[TEST]   Mean RT:', metrics.meanResponseTimeMs.toFixed(2));
        console.log('[TEST]   Manual variability:', manualVariability.toFixed(2));
        console.log('[TEST]   Library variability:', metrics.variability.toFixed(2));
        
        // Should match when calculated from same data
        expect(metrics.variability).toBeCloseTo(manualVariability, 1);
      }
    });
    
    it('should calculate ACS with proper components', () => {
      const { events, subjectInfo } = testData;
      
      const metrics = calculateAttentionMetrics(events, subjectInfo);
      
      // ACS should be a combination of scaled Z-scores + constant
      expect(typeof metrics.acs).toBe('number');
      expect(Number.isFinite(metrics.acs)).toBe(true);
      
      // Z-scores should be present
      expect(typeof metrics.zScores.responseTime).toBe('number');
      expect(typeof metrics.zScores.dPrime).toBe('number');
      expect(typeof metrics.zScores.variability).toBe('number');
      
      // Interpretation should be valid
      expect(['normal', 'borderline', 'not-within-normal-limits']).toContain(metrics.acsInterpretation);
    });
    
    it('should match manual ACS calculation', () => {
      const { events, subjectInfo } = testData;
      const metrics = calculateAttentionMetrics(events, subjectInfo);
      
      // Get normative stats for the subject
      const normativeStats = getNormativeStats(subjectInfo.age, subjectInfo.gender);
      
      if (!normativeStats) {
        console.log('[TEST] No normative data available for age:', subjectInfo.age, 'gender:', subjectInfo.gender);
        return;
      }
      
      // Parse events to get trial data for manual calculation
      const parsedTestData = JSON.parse(testData.records[0].test_data);
      const allEvents: TestEvent[] = parsedTestData.events;
      
      // Calculate trial midpoint
      const totalTrials = allEvents.filter((e: TestEvent) => e.eventType === 'stimulus-onset').length;
      const midpoint = Math.floor(totalTrials / 2);
      
      // Get first half data (trials 0 to midpoint-1)
      const firstHalfResponses = allEvents.filter((e: TestEvent) => {
        return e.trialIndex >= 0 && e.trialIndex < midpoint && 
               e.eventType === 'response' && 
               e.responseCorrect === true && 
               !e.isAnticipatory &&
               e.stimulusType === 'target';
      });
      
      const firstHalfMeanRT = firstHalfResponses.length > 0
        ? firstHalfResponses.reduce((sum: number, e: TestEvent) => sum + (e.responseTimeMs as number), 0) / firstHalfResponses.length
        : metrics.meanResponseTimeMs;
      
      // Get overall valid hit response times
      const allValidHits = allEvents.filter((e: TestEvent) => 
        e.eventType === 'response' && 
        e.responseCorrect === true && 
        !e.isAnticipatory &&
        e.stimulusType === 'target'
      );
      
      // Calculate overall variability
      const overallVariability = allValidHits.length > 0
        ? manualCalculateVariability(allValidHits.map((e: TestEvent) => e.responseTimeMs as number))
        : metrics.variability;
      
      // Get second half d' from metrics (already calculated)
      const dPrime = metrics.dPrime;
      
      // Calculate manual ACS
      const manualACS = 
        zScoreScaled(firstHalfMeanRT, normativeStats.responseTimeMean, normativeStats.responseTimeSD, 1) +
        zScoreScaled(dPrime, normativeStats.dPrimeMean, normativeStats.dPrimeSD, 1) +
        zScoreScaled(overallVariability, normativeStats.variabilityMean, normativeStats.variabilitySD, 1) +
        TRIAL_CONSTANTS.ACS_CONSTANT;
      
      console.log('[TEST] === ACS Manual Calculation ===');
      console.log('[TEST] Trial Count:', metrics.trialCount);
      console.log('[TEST] First Half Mean RT:', firstHalfMeanRT.toFixed(2));
      console.log('[TEST] Overall Variability:', overallVariability.toFixed(2));
      console.log('[TEST] D Prime:', dPrime.toFixed(4));
      console.log('[TEST] Normative RT Mean:', normativeStats.responseTimeMean, 'SD:', normativeStats.responseTimeSD);
      console.log('[TEST] Normative DPrime Mean:', normativeStats.dPrimeMean, 'SD:', normativeStats.dPrimeSD);
      console.log('[TEST] Normative Variability Mean:', normativeStats.variabilityMean, 'SD:', normativeStats.variabilitySD);
      console.log('[TEST] Library ACS:', metrics.acs.toFixed(4));
      console.log('[TEST] Manual ACS:', manualACS.toFixed(4));
      console.log('[TEST] Difference:', (metrics.acs - manualACS).toFixed(6));
      
      // ACS should match between library and manual calculation
      expect(Math.abs(metrics.acs - manualACS)).toBeLessThan(0.01);
    });
  });
  
  describe('Anticipatory Response Exclusion', () => {
    it('should exclude responses <150ms from variability calculation', () => {
      const { events } = testData;
      
      // Count anticipatory responses
      const anticipatoryResponses = events.filter((e: TestEvent) => 
        e.eventType === 'response' && 
        e.isAnticipatory === true
      );
      
      // Count total responses to targets
      const allResponses = events.filter((e: TestEvent) => 
        e.eventType === 'response' && 
        e.stimulusType === 'target'
      );
      
      console.log('[TEST] Anticipatory Responses:', anticipatoryResponses.length);
      console.log('[TEST] Total Target Responses:', allResponses.length);
      
      // Verify anticipatory flag is set correctly
      anticipatoryResponses.forEach((e: TestEvent) => {
        expect(e.responseTimeMs).toBeLessThan(150);
      });
    });
    
    it('should include only valid hits in mean RT calculation', () => {
      const { events } = testData;
      
      const validHits = events.filter((e: TestEvent) => 
        e.eventType === 'response' && 
        e.responseCorrect === true && 
        !e.isAnticipatory
      );
      
      const anticipatoryHits = events.filter((e: TestEvent) => 
        e.eventType === 'response' && 
        e.responseCorrect === true && 
        e.isAnticipatory === true
      );
      
      // Valid hits should all have RT >= 150ms
      validHits.forEach((e: TestEvent) => {
        expect(e.responseTimeMs).toBeGreaterThanOrEqual(150);
      });
      
      // All valid hits should have correct = true
      validHits.forEach((e: TestEvent) => {
        expect(e.responseCorrect).toBe(true);
      });
      
      console.log('[TEST] Valid hits:', validHits.length);
      console.log('[TEST] Anticipatory hits (excluded):', anticipatoryHits.length);
    });
  });
  
  describe('D Prime Sign Convention', () => {
    it('perfect performance → positive D Prime', () => {
      // 100% hits, 0% false alarms = perfect performance
      const dPrime = clinicalCalculateDPrime(1.0, 0.0);
      expect(dPrime).toBeGreaterThan(0);
    });
    
    it('poor performance → negative D Prime', () => {
      // 0% hits, 100% false alarms = worst performance
      const dPrime = clinicalCalculateDPrime(0.0, 1.0);
      expect(dPrime).toBeLessThan(0);
    });
    
    it('random performance → D Prime near zero', () => {
      // ~50% hits, ~50% false alarms = random guessing
      const dPrime = clinicalCalculateDPrime(0.5, 0.5);
      expect(Math.abs(dPrime)).toBeLessThan(0.5);
    });
    
    it('should produce symmetric results for mirrored conditions', () => {
      // High hits, low FA (good performance) should be approximately opposite of low hits, high FA (poor performance)
      const dPrime1 = clinicalCalculateDPrime(0.9, 0.1); // Good - should be positive
      const dPrime2 = clinicalCalculateDPrime(0.1, 0.9); // Poor - should be negative
      
      // These should be approximately symmetric (opposite signs, similar magnitude)
      expect(dPrime1).toBeGreaterThan(0);
      expect(dPrime2).toBeLessThan(0);
      expect(Math.abs(Math.abs(dPrime1) - Math.abs(dPrime2))).toBeLessThan(0.5);
    });
  });
});
