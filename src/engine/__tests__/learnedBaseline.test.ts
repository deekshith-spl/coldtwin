// ============================================================
// Tests: Learned Baseline Anomaly Detector
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  median,
  mad,
  learnChamberBaseline,
  computeLearnedAnomalyScore,
  computeLearnedBandPoint,
} from '../learnedBaseline';
import { computeThermalPredictions } from '../thermalTwin';
import { computeFaultAlert, injectFaultPattern } from '../faultDetection';
import type { Chamber, Reading, ThermalPrediction } from '@/types';

const testChamber: Chamber = {
  id: 'C1',
  name: 'Chamber 1 – Potato',
  targetTempC: 4,
  ambientTempC: 32,
  compressorKW: 7.5,
};

function generateReadingsForDays(chamber: Chamber, days: number, injectFaultFromDay?: number): Reading[] {
  const readings: Reading[] = [];
  const baseDate = new Date('2026-01-01T00:00:00Z');
  let id = 1;

  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      const ts = new Date(baseDate.getTime() + (d * 24 + h) * 3600000);
      const diurnal = 0.3 * Math.sin((h - 14) * Math.PI / 12);
      let tempC = chamber.targetTempC + diurnal;

      // Inject fault if specified
      if (injectFaultFromDay !== undefined && d >= injectFaultFromDay) {
        tempC += 3.5; // Significant temperature rise
      }

      readings.push({
        id: `R${id++}`,
        chamberId: chamber.id,
        timestamp: ts.toISOString(),
        tempC: parseFloat(tempC.toFixed(2)),
        humidity: 90,
        compressorRunHours: 0.55,
        doorOpenCount: 0,
        intervalHours: 1,
      });
    }
  }

  return readings;
}

describe('Robust Statistics: median and mad', () => {
  it('computes exact median for odd and even length arrays', () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
    expect(median([5])).toBe(5);
  });

  it('computes MAD correctly and handles zero dispersion', () => {
    // Array: [2, 2, 2, 2], median = 2, deviations = [0, 0, 0, 0], MAD = 0
    expect(mad([2, 2, 2, 2])).toBe(0);

    // Array: [1, 2, 3, 4, 5, 6, 7, 8, 9], median = 5, |x - 5| = [4, 3, 2, 1, 0, 1, 2, 3, 4] -> sorted: [0, 1, 1, 2, 2, 3, 3, 4, 4], median is 2
    expect(mad([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(2);
  });
});

describe('learnChamberBaseline', () => {
  it('learns 24 hourly median and MAD values from earlier readings', () => {
    const readings = generateReadingsForDays(testChamber, 10);
    const predictions = computeThermalPredictions(testChamber, readings);
    const baseline = learnChamberBaseline(testChamber.id, readings, predictions);

    expect(baseline.chamberId).toBe(testChamber.id);
    expect(baseline.baselineReadingCount).toBeGreaterThan(0);
    expect(Object.keys(baseline.hourly).length).toBe(24);

    for (let h = 0; h < 24; h++) {
      const hBase = baseline.hourly[h];
      expect(hBase).toBeDefined();
      expect(hBase.hour).toBe(h);
      expect(typeof hBase.median).toBe('number');
      expect(hBase.mad).toBeGreaterThanOrEqual(0.15); // floored for safety
    }
  });

  it('handles empty or short readings gracefully', () => {
    const baseline = learnChamberBaseline(testChamber.id, [], []);
    expect(baseline.baselineReadingCount).toBe(0);
    expect(Object.keys(baseline.hourly).length).toBe(24);
  });
});

describe('computeLearnedAnomalyScore', () => {
  it('yields low score (< 15) for healthy readings conforming to baseline', () => {
    const readings = generateReadingsForDays(testChamber, 10);
    const predictions = computeThermalPredictions(testChamber, readings);
    const baseline = learnChamberBaseline(testChamber.id, readings, predictions);

    const result = computeLearnedAnomalyScore(testChamber, readings, predictions, baseline);

    expect(result.anomalyScore).toBeLessThan(15);
    expect(result.reason).toBeUndefined();
  });

  it('yields high score (> 60) for injected fault with plain-language reason', () => {
    const readings = generateReadingsForDays(testChamber, 10);
    const faultyReadings = injectFaultPattern(readings, 'blocked_coil', readings.length - 24);
    const predictions = computeThermalPredictions(testChamber, faultyReadings);
    const baseline = learnChamberBaseline(testChamber.id, faultyReadings, predictions);

    const result = computeLearnedAnomalyScore(testChamber, faultyReadings, predictions, baseline);

    expect(result.anomalyScore).toBeGreaterThanOrEqual(60);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain('is behaving unlike its own usual pattern at this hour');
    expect(result.suggestedAction).toBeDefined();
  });

  it('respects alertThresholds: strict threshold raises anomaly score faster', () => {
    const readings = generateReadingsForDays(testChamber, 6);
    const faultyReadings = injectFaultPattern(readings, 'blocked_coil', readings.length - 12);
    const predictions = computeThermalPredictions(testChamber, faultyReadings);
    const baseline = learnChamberBaseline(testChamber.id, faultyReadings, predictions);

    // Stricter threshold (1.0°C) should produce higher anomaly score than lenient threshold (3.0°C)
    const strictResult = computeLearnedAnomalyScore(testChamber, faultyReadings, predictions, baseline, {
      tempDeviationAlert: 1.0,
      riskScoreAlert: 60,
      shelfLifeRedDays: 3,
      shelfLifeAmberDays: 7,
    });

    const lenientResult = computeLearnedAnomalyScore(testChamber, faultyReadings, predictions, baseline, {
      tempDeviationAlert: 3.0,
      riskScoreAlert: 60,
      shelfLifeRedDays: 3,
      shelfLifeAmberDays: 7,
    });

    expect(strictResult.anomalyScore).toBeGreaterThan(lenientResult.anomalyScore);
  });
});

describe('computeLearnedBandPoint', () => {
  it('calculates proper lower, upper, base, and band width', () => {
    const readings = generateReadingsForDays(testChamber, 5);
    const predictions = computeThermalPredictions(testChamber, readings);
    const baseline = learnChamberBaseline(testChamber.id, readings, predictions);

    const band = computeLearnedBandPoint('2026-01-05T14:00:00Z', 4.0, baseline, 2.0);

    expect(band.upper).toBeGreaterThan(band.lower);
    expect(band.band).toBeCloseTo(band.upper - band.lower, 2);
    expect(band.base).toBe(band.lower);
  });
});

describe('Fault Alert Integration with Learned Baseline', () => {
  it('healthy chamber receives low overall fault risk score', () => {
    const readings = generateReadingsForDays(testChamber, 10);
    const predictions = computeThermalPredictions(testChamber, readings);
    const alert = computeFaultAlert(testChamber, readings, predictions);

    expect(alert.riskScore).toBeLessThan(30);
    expect(alert.level).toBe('green');
    expect(alert.reason).toContain('is operating normally');
  });

  it('synthetic fault injection elevates risk score and includes learned baseline reason', () => {
    const healthy = generateReadingsForDays(testChamber, 8);
    const faulty = injectFaultPattern(healthy, 'blocked_coil', healthy.length - 24);
    const predictions = computeThermalPredictions(testChamber, faulty);
    const alert = computeFaultAlert(testChamber, faulty, predictions);

    expect(alert.riskScore).toBeGreaterThan(40);
    expect(['amber', 'red']).toContain(alert.level);
    // At least one top factor should identify the anomalous pattern
    expect(alert.topFactors.some(f => f.includes('unlike its own usual pattern') || f.includes('Expected') || f.includes('duty cycle'))).toBe(true);
  });
});
