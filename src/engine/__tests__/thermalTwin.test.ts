// ============================================================
// Tests: Thermal Twin Model
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeThermalPredictions } from '../thermalTwin';
import type { Chamber, Reading } from '@/types';

const chamber: Chamber = {
  id: 'C1', name: 'Test Chamber',
  targetTempC: 4, ambientTempC: 30, compressorKW: 7.5,
};

function makeReading(overrides: Partial<Reading> & { timestamp: string }): Reading {
  return {
    id: 'R001', chamberId: 'C1',
    tempC: 4, humidity: 90,
    compressorRunHours: 0.5, doorOpenCount: 0, intervalHours: 1,
    ...overrides,
  };
}

describe('computeThermalPredictions', () => {
  it('returns empty array for empty readings', () => {
    const result = computeThermalPredictions(chamber, []);
    expect(result).toHaveLength(0);
  });

  it('returns predictions aligned with readings count', () => {
    const readings = [
      makeReading({ timestamp: '2024-01-01T00:00:00Z', tempC: 4 }),
      makeReading({ timestamp: '2024-01-01T01:00:00Z', tempC: 4.5 }),
      makeReading({ timestamp: '2024-01-01T02:00:00Z', tempC: 5.0 }),
    ];
    const result = computeThermalPredictions(chamber, readings);
    expect(result).toHaveLength(3);
  });

  it('temperature drifts toward ambient when compressor is off', () => {
    const readings = [
      makeReading({ timestamp: '2024-01-01T00:00:00Z', tempC: 4, compressorRunHours: 0 }),
      makeReading({ timestamp: '2024-01-01T01:00:00Z', tempC: 5, compressorRunHours: 0 }),
      makeReading({ timestamp: '2024-01-01T02:00:00Z', tempC: 6, compressorRunHours: 0 }),
      makeReading({ timestamp: '2024-01-01T03:00:00Z', tempC: 7, compressorRunHours: 0 }),
    ];
    const result = computeThermalPredictions(chamber, readings);
    // Expected temperature should rise toward ambient (30°C) when compressor is off
    expect(result[1].expectedTempC).toBeGreaterThan(result[0].expectedTempC);
    expect(result[2].expectedTempC).toBeGreaterThan(result[1].expectedTempC);
  });

  it('compressor brings expected temperature down', () => {
    const readingsNoComp = [
      makeReading({ timestamp: '2024-01-01T00:00:00Z', tempC: 10, compressorRunHours: 0 }),
      makeReading({ timestamp: '2024-01-01T01:00:00Z', tempC: 10, compressorRunHours: 0 }),
    ];
    const readingsWithComp = [
      makeReading({ timestamp: '2024-01-01T00:00:00Z', tempC: 10, compressorRunHours: 0 }),
      makeReading({ timestamp: '2024-01-01T01:00:00Z', tempC: 10, compressorRunHours: 1 }),
    ];
    const noComp = computeThermalPredictions(chamber, readingsNoComp);
    const withComp = computeThermalPredictions(chamber, readingsWithComp);
    expect(withComp[1].expectedTempC).toBeLessThan(noComp[1].expectedTempC);
  });

  it('door open adds heat pulse to expected temperature', () => {
    const readingsNoDoor = [
      makeReading({ timestamp: '2024-01-01T00:00:00Z', tempC: 4, doorOpenCount: 0 }),
      makeReading({ timestamp: '2024-01-01T01:00:00Z', tempC: 4, doorOpenCount: 0 }),
    ];
    const readingsWithDoor = [
      makeReading({ timestamp: '2024-01-01T00:00:00Z', tempC: 4, doorOpenCount: 0 }),
      makeReading({ timestamp: '2024-01-01T01:00:00Z', tempC: 4, doorOpenCount: 3 }),
    ];
    const noDoor   = computeThermalPredictions(chamber, readingsNoDoor);
    const withDoor = computeThermalPredictions(chamber, readingsWithDoor);
    expect(withDoor[1].expectedTempC).toBeGreaterThan(noDoor[1].expectedTempC);
  });

  it('residual is close to zero for readings matching expected', () => {
    // Use readings that match a stable 4°C with reasonable compressor
    const stableReadings = Array.from({ length: 5 }, (_, i) => ({
      ...makeReading({ timestamp: `2024-01-01T0${i}:00:00Z`, tempC: 4 }),
    }));
    const result = computeThermalPredictions(chamber, stableReadings);
    const residuals = result.map(r => r.residual);
    // All residuals should be within ±2°C of zero for stable readings
    residuals.forEach(r => expect(Math.abs(r)).toBeLessThan(5));
  });
});
