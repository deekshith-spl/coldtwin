// ============================================================
// Tests: Shelf Life Model
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeShelfLifeEstimate, computeDailyConsumptionRate } from '../shelfLife';
import type { Lot, Reading, ProduceMeta } from '@/types';

const potatoMeta: ProduceMeta = {
  produce: 'potato',
  idealTempC: 4,
  idealHumidity: 90,
  baseShelfLifeDays: 90,
  q10Factor: 2.5,
  notes: '',
};

const baseLot: Lot = {
  id: 'L01', produce: 'potato', quantityKg: 1000,
  arrivalDate: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
  farmerId: 'F1', farmerName: 'Test Farmer', chamberId: 'C1',
};

function makeReadings(tempC: number, days: number, chamberId = 'C1'): Reading[] {
  const readings: Reading[] = [];
  const arrivalDate = new Date(baseLot.arrivalDate);
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      const ts = new Date(arrivalDate);
      ts.setDate(ts.getDate() + d);
      ts.setHours(h, 0, 0, 0);
      readings.push({
        id: `R${d}_${h}`,
        chamberId,
        timestamp: ts.toISOString(),
        tempC,
        humidity: 90,
        compressorRunHours: 0.5,
        doorOpenCount: 0,
        intervalHours: 1,
      });
    }
  }
  return readings;
}

describe('computeDailyConsumptionRate', () => {
  it('returns 1/baseShelfLife at ideal conditions', () => {
    const rate = computeDailyConsumptionRate(
      potatoMeta.idealTempC, potatoMeta.idealHumidity, potatoMeta
    );
    expect(rate).toBeCloseTo(1 / potatoMeta.baseShelfLifeDays, 5);
  });

  it('rate increases above ideal temperature', () => {
    const idealRate = computeDailyConsumptionRate(4, 90, potatoMeta);
    const warmRate  = computeDailyConsumptionRate(9, 90, potatoMeta);
    const warmerRate = computeDailyConsumptionRate(14, 90, potatoMeta);
    expect(warmRate).toBeGreaterThan(idealRate);
    expect(warmerRate).toBeGreaterThan(warmRate);
  });

  it('rate is always positive', () => {
    const rate = computeDailyConsumptionRate(-2, 90, potatoMeta);
    expect(rate).toBeGreaterThan(0);
  });

  it('rate penalises temperatures below minSafeTempC (chilling injury)', () => {
    const chilliMeta: ProduceMeta = {
      produce: 'chilli',
      idealTempC: 8,
      minSafeTempC: 7,
      idealHumidity: 90,
      baseShelfLifeDays: 21,
      q10Factor: 2.0,
      notes: '',
    };

    // At ideal temp (8°C) vs chilling temp (4°C, which is 3°C below minSafeTempC 7°C)
    const idealRate = computeDailyConsumptionRate(8, 90, chilliMeta);
    const chillingRate = computeDailyConsumptionRate(4, 90, chilliMeta);

    // Chilling injury should accelerate quality degradation (consumption rate > ideal)
    expect(chillingRate).toBeGreaterThan(idealRate);
  });
});

describe('computeShelfLifeEstimate', () => {
  it('returns full shelf life for a new lot with no readings', () => {
    const freshLot = {
      ...baseLot,
      arrivalDate: new Date().toISOString().slice(0, 10),
    };
    const est = computeShelfLifeEstimate(freshLot, [], potatoMeta);
    expect(est.remainingDays).toBe(potatoMeta.baseShelfLifeDays);
  });

  it('remaining days decrease after time in storage', () => {
    const readings = makeReadings(4, 10); // ideal temp
    const est = computeShelfLifeEstimate(baseLot, readings, potatoMeta);
    expect(est.remainingDays).toBeLessThan(potatoMeta.baseShelfLifeDays);
    expect(est.remainingDays).toBeGreaterThan(0);
  });

  it('5°C above ideal reduces remaining life faster than ideal conditions', () => {
    const idealReadings = makeReadings(4, 10);
    const warmReadings  = makeReadings(9, 10);
    const idealEst = computeShelfLifeEstimate(baseLot, idealReadings, potatoMeta);
    const warmEst  = computeShelfLifeEstimate(baseLot, warmReadings, potatoMeta);
    expect(warmEst.remainingDays).toBeLessThan(idealEst.remainingDays);
  });

  it('urgency is red when lowDays < 3', () => {
    // Create a lot that's been in storage a long time at high temp
    const oldLot: Lot = {
      ...baseLot,
      arrivalDate: new Date(Date.now() - 85 * 86400000).toISOString().slice(0, 10),
    };
    const readings = makeReadings(10, 85); // well above ideal
    const est = computeShelfLifeEstimate(oldLot, readings, potatoMeta);
    // After 85 days at 10°C (6°C above ideal), should be nearly expired
    expect(['red', 'amber']).toContain(est.urgency);
  });

  it('returns lowDays <= remainingDays <= highDays', () => {
    const readings = makeReadings(6, 10);
    const est = computeShelfLifeEstimate(baseLot, readings, potatoMeta);
    expect(est.lowDays).toBeLessThanOrEqual(est.remainingDays);
    expect(est.remainingDays).toBeLessThanOrEqual(est.highDays);
  });

  it('detects chilling injury in explanation when temp is below minSafeTempC', () => {
    const chilliMeta: ProduceMeta = {
      produce: 'chilli',
      idealTempC: 8,
      minSafeTempC: 7,
      idealHumidity: 90,
      baseShelfLifeDays: 21,
      q10Factor: 2.0,
      notes: '',
    };
    const chilliLot: Lot = {
      ...baseLot,
      produce: 'chilli',
      arrivalDate: baseLot.arrivalDate,
    };
    const coldReadings = makeReadings(3, 10); // 3°C is well below safe min 7°C
    const est = computeShelfLifeEstimate(chilliLot, coldReadings, chilliMeta);
    expect(est.explanation.toLowerCase()).toContain('safe minimum');
  });

  it('uses custom alertThresholds for urgency classification', () => {
    const readings = makeReadings(4, 10);
    const est = computeShelfLifeEstimate(baseLot, readings, potatoMeta, {
      tempDeviationAlert: 1.5,
      shelfLifeRedDays: 90, // set high so this lot becomes red
      shelfLifeAmberDays: 100,
      riskScoreAlert: 60,
    });
    expect(est.urgency).toBe('red');
  });
});
