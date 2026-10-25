// ============================================================
// Tests: Energy Waste Estimator
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeEnergyWaste, totalEnergyWaste } from '../energyWaste';
import type { Chamber, Reading } from '@/types';

const chamber: Chamber = {
  id: 'C1', name: 'Chamber 1',
  targetTempC: 4, ambientTempC: 30, compressorKW: 7.5,
};

function makeReadings(dutyCycle: number, hours: number): Reading[] {
  return Array.from({ length: hours }, (_, i) => ({
    id: `R${i}`, chamberId: 'C1',
    timestamp: new Date(Date.now() - (hours - i) * 3600000).toISOString(),
    tempC: 4, humidity: 90,
    compressorRunHours: dutyCycle,
    doorOpenCount: 0, intervalHours: 1,
  }));
}

describe('computeEnergyWaste', () => {
  it('returns 0 extra kWh for healthy duty cycle (50%)', () => {
    const readings = makeReadings(0.5, 24);
    const result = computeEnergyWaste(chamber, readings, 8);
    expect(result.extraKwh).toBe(0);
    expect(result.extraCostINR).toBe(0);
  });

  it('returns positive extra kWh for high duty cycle (90%)', () => {
    const readings = makeReadings(0.9, 24);
    const result = computeEnergyWaste(chamber, readings, 8);
    expect(result.extraKwh).toBeGreaterThan(0);
    expect(result.extraCostINR).toBeGreaterThan(0);
  });

  it('cost scales with tariff', () => {
    const readings = makeReadings(0.8, 24);
    const lowTariff  = computeEnergyWaste(chamber, readings, 5);
    const highTariff = computeEnergyWaste(chamber, readings, 10);
    expect(highTariff.extraCostINR).toBeGreaterThan(lowTariff.extraCostINR);
  });

  it('returns 0 extra kWh for empty readings', () => {
    const result = computeEnergyWaste(chamber, [], 8);
    expect(result.extraKwh).toBe(0);
  });

  it('cost = extraKwh × tariff', () => {
    const readings = makeReadings(0.75, 24);
    const tariff = 8;
    const result = computeEnergyWaste(chamber, readings, tariff);
    expect(result.extraCostINR).toBeCloseTo(result.extraKwh * tariff, 1);
  });
});

describe('totalEnergyWaste', () => {
  it('sums extraKwh and extraCostINR across chambers', () => {
    const estimates = [
      { chamberId: 'C1', extraKwh: 10, extraCostINR: 80, reason: '' },
      { chamberId: 'C2', extraKwh: 5,  extraCostINR: 40, reason: '' },
    ];
    const total = totalEnergyWaste(estimates);
    expect(total.totalExtraKwh).toBeCloseTo(15, 2);
    expect(total.totalExtraCostINR).toBeCloseTo(120, 2);
  });
});
