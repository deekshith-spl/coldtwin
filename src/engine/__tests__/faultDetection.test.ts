// ============================================================
// Tests: Fault Detection
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeFaultAlert, injectFaultPattern } from '../faultDetection';
import { computeThermalPredictions } from '../thermalTwin';
import type { Chamber, Reading } from '@/types';

const chamber: Chamber = {
  id: 'C2', name: 'Chamber 2',
  targetTempC: 1, ambientTempC: 32, compressorKW: 7.5,
};

function makeHealthyReadings(count: number): Reading[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `R${i}`,
    chamberId: 'C2',
    timestamp: new Date(Date.now() - (count - i) * 3600000).toISOString(),
    tempC: 1 + Math.random() * 0.3 - 0.15,
    humidity: 92,
    compressorRunHours: 0.5 + Math.random() * 0.1,
    doorOpenCount: i % 8 === 0 ? 1 : 0,
    intervalHours: 1,
  }));
}

describe('computeFaultAlert', () => {
  it('returns riskScore 0 and green for healthy chamber with few readings', () => {
    const alert = computeFaultAlert(chamber, [], []);
    expect(alert.riskScore).toBe(0);
    expect(alert.level).toBe('green');
  });

  it('returns low risk score for healthy readings', () => {
    const readings = makeHealthyReadings(48);
    const predictions = computeThermalPredictions(chamber, readings);
    const alert = computeFaultAlert(chamber, readings, predictions);
    // Healthy chamber should score below 50
    expect(alert.riskScore).toBeLessThan(50);
  });

  it('returns higher risk score after blocked-coil fault injection', () => {
    const readings = makeHealthyReadings(48);
    const faultyReadings = injectFaultPattern(readings, 'blocked_coil', 24);
    const predictions = computeThermalPredictions(chamber, faultyReadings);
    const alert = computeFaultAlert(chamber, faultyReadings, predictions);
    expect(alert.riskScore).toBeGreaterThan(10);
  });

  it('risk score is 0–100', () => {
    const readings = makeHealthyReadings(48);
    const faultyReadings = injectFaultPattern(readings, 'door_left_open', 0);
    const predictions = computeThermalPredictions(chamber, faultyReadings);
    const alert = computeFaultAlert(chamber, faultyReadings, predictions);
    expect(alert.riskScore).toBeGreaterThanOrEqual(0);
    expect(alert.riskScore).toBeLessThanOrEqual(100);
  });

  it('includes a reason and suggested action', () => {
    const readings = makeHealthyReadings(10);
    const predictions = computeThermalPredictions(chamber, readings);
    const alert = computeFaultAlert(chamber, readings, predictions);
    expect(typeof alert.reason).toBe('string');
    expect(typeof alert.suggestedAction).toBe('string');
    expect(alert.reason.length).toBeGreaterThan(0);
  });
});

describe('injectFaultPattern', () => {
  it('does not modify original readings (immutable)', () => {
    const readings = makeHealthyReadings(30);
    const original = readings.map(r => ({ ...r }));
    injectFaultPattern(readings, 'blocked_coil', 0);
    expect(readings[0].tempC).toBe(original[0].tempC);
  });

  it('blocked coil increases temperature in affected range', () => {
    const readings = makeHealthyReadings(30);
    const original = readings.map(r => r.tempC);
    const faulted  = injectFaultPattern(readings, 'blocked_coil', 5);
    const sumOriginal = original.slice(5, 15).reduce((a, b) => a + b, 0);
    const sumFaulted  = faulted.slice(5, 15).map(r => r.tempC).reduce((a, b) => a + b, 0);
    expect(sumFaulted).toBeGreaterThan(sumOriginal);
  });
});
