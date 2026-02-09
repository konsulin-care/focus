/**
 * F.O.C.U.S. Assessment - Clinical Metrics
 * 
 * Clinical-specific metric functions for attention assessment.
 * 
 * This module re-exports clinical functions from distributions.ts.
 * The canonical implementations are now in ./distributions
 */

// Re-export clinical metrics from distributions module
export { calculateDPrime, inverseNormalCDF } from './distributions';
