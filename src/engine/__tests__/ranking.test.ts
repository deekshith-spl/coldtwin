// ============================================================
// Tests: Lot Ranking Engine
// ============================================================

import { describe, it, expect } from 'vitest';
import { rankLots } from '../ranking';
import type { Lot, Reading, ProduceMeta, AlertThresholds } from '@/types';

const testMeta: ProduceMeta[] = [
  {
    produce: 'potato',
    idealTempC: 4,
    idealHumidity: 90,
    baseShelfLifeDays: 90,
    q10Factor: 2.5,
    notes: 'Potato meta',
  },
  {
    produce: 'apple',
    idealTempC: 1,
    idealHumidity: 92,
    baseShelfLifeDays: 60,
    q10Factor: 2.2,
    notes: 'Apple meta',
  },
  {
    produce: 'chilli',
    idealTempC: 8,
    minSafeTempC: 7,
    idealHumidity: 90,
    baseShelfLifeDays: 21,
    q10Factor: 2.0,
    notes: 'Chilli meta',
  },
];

function createSampleReadings(): Reading[] {
  // 5 days of normal readings at 4°C
  const readings: Reading[] = [];
  const now = Date.now();
  for (let i = 0; i < 120; i++) {
    readings.push({
      id: `R_${i}`,
      chamberId: 'C1',
      timestamp: new Date(now - (120 - i) * 3600000).toISOString(),
      tempC: 4.0,
      humidity: 90,
      compressorRunHours: 0.5,
      doorOpenCount: 0,
      intervalHours: 1,
    });
  }
  return readings;
}

describe('rankLots', () => {
  it('ranks lots in order of urgency (red before amber before green) and remaining shelf life', () => {
    const now = Date.now();
    const readings = createSampleReadings();

    const lots: Lot[] = [
      {
        id: 'LOT_FRESH',
        produce: 'potato',
        quantityKg: 500,
        arrivalDate: new Date(now).toISOString().slice(0, 10), // just arrived -> high remaining days (green)
        farmerId: 'F1',
        farmerName: 'Farmer One',
        chamberId: 'C1',
      },
      {
        id: 'LOT_EXPIRING_CHILLI',
        produce: 'chilli',
        quantityKg: 200,
        arrivalDate: new Date(now - 19 * 86400000).toISOString().slice(0, 10), // 19 days old of 21 days base -> red
        farmerId: 'F2',
        farmerName: 'Farmer Two',
        chamberId: 'C1',
      },
      {
        id: 'LOT_MEDIUM_APPLE',
        produce: 'apple',
        quantityKg: 300,
        arrivalDate: new Date(now - 55 * 86400000).toISOString().slice(0, 10), // 55 days old of 60 days base -> amber/red
        farmerId: 'F1',
        farmerName: 'Farmer One',
        chamberId: 'C1',
      },
    ];

    const ranked = rankLots(lots, readings, testMeta);

    expect(ranked).toHaveLength(3);
    // LOT_EXPIRING_CHILLI should have the least remaining days / urgency red
    expect(ranked[0].lot.id).toBe('LOT_EXPIRING_CHILLI');
    expect(ranked[0].rank).toBe(1);

    // LOT_FRESH should be ranked last because it has the longest remaining days
    expect(ranked[2].lot.id).toBe('LOT_FRESH');
    expect(ranked[2].rank).toBe(3);

    // Verify ranks are 1-based sequential integers
    expect(ranked.map(r => r.rank)).toEqual([1, 2, 3]);
  });

  it('handles ties consistently and preserves deterministic rank numbering', () => {
    const now = Date.now();
    const arrival = new Date(now - 10 * 86400000).toISOString().slice(0, 10);
    const readings = createSampleReadings();

    // Two lots with identical produce, arrival date, and chamber
    const lots: Lot[] = [
      {
        id: 'LOT_TIE_A',
        produce: 'potato',
        quantityKg: 1000,
        arrivalDate: arrival,
        farmerId: 'F1',
        farmerName: 'Farmer One',
        chamberId: 'C1',
      },
      {
        id: 'LOT_TIE_B',
        produce: 'potato',
        quantityKg: 2000,
        arrivalDate: arrival,
        farmerId: 'F2',
        farmerName: 'Farmer Two',
        chamberId: 'C1',
      },
    ];

    const ranked = rankLots(lots, readings, testMeta);

    expect(ranked).toHaveLength(2);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    // Both lots have identical remainingDays and lowDays
    expect(ranked[0].remainingDays).toBe(ranked[1].remainingDays);
    expect(ranked[0].lowDays).toBe(ranked[1].lowDays);
  });

  it('filters and ranks only a specific farmer lots when filtered', () => {
    const now = Date.now();
    const readings = createSampleReadings();

    const lots: Lot[] = [
      {
        id: 'LOT_F1_1',
        produce: 'potato',
        quantityKg: 500,
        arrivalDate: new Date(now - 30 * 86400000).toISOString().slice(0, 10),
        farmerId: 'F1',
        farmerName: 'Farmer One',
        chamberId: 'C1',
      },
      {
        id: 'LOT_F2_1',
        produce: 'chilli',
        quantityKg: 200,
        arrivalDate: new Date(now - 20 * 86400000).toISOString().slice(0, 10),
        farmerId: 'F2',
        farmerName: 'Farmer Two',
        chamberId: 'C1',
      },
      {
        id: 'LOT_F1_2',
        produce: 'potato',
        quantityKg: 600,
        arrivalDate: new Date(now - 10 * 86400000).toISOString().slice(0, 10),
        farmerId: 'F1',
        farmerName: 'Farmer One',
        chamberId: 'C1',
      },
    ];

    // Filter for Farmer 1 only
    const f1Lots = lots.filter(l => l.farmerId === 'F1');
    const rankedF1 = rankLots(f1Lots, readings, testMeta);

    expect(rankedF1).toHaveLength(2);
    // All returned lots belong strictly to Farmer 1
    expect(rankedF1.every(r => r.lot.farmerId === 'F1')).toBe(true);
    // Ranks start at 1 and increment consecutively
    expect(rankedF1[0].rank).toBe(1);
    expect(rankedF1[1].rank).toBe(2);
    expect(rankedF1[0].lot.id).toBe('LOT_F1_1'); // older lot has fewer days left
    expect(rankedF1[1].lot.id).toBe('LOT_F1_2');
  });

  it('respects custom alertThresholds for urgency classification', () => {
    const now = Date.now();
    const readings = createSampleReadings();

    // A lot with ~10 days remaining
    const lot: Lot = {
      id: 'LOT_THRESHOLD',
      produce: 'potato',
      quantityKg: 500,
      arrivalDate: new Date(now - 80 * 86400000).toISOString().slice(0, 10), // 80 days of 90 days base
      farmerId: 'F1',
      farmerName: 'Farmer One',
      chamberId: 'C1',
    };

    // Default thresholds (red < 3, amber < 7) -> with lowDays ~42.5 it is green
    const defaultRanked = rankLots([lot], readings, testMeta);

    // Custom strict thresholds: red <= 50 days, amber <= 70 days
    const strictThresholds: AlertThresholds = {
      tempDeviationAlert: 1.5,
      shelfLifeRedDays: 50,
      shelfLifeAmberDays: 70,
      riskScoreAlert: 60,
    };

    const strictRanked = rankLots([lot], readings, testMeta, strictThresholds);

    expect(strictRanked[0].urgency).toBe('red');
    expect(defaultRanked[0].urgency).toBe('green');
  });
});
