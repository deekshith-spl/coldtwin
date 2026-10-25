// ============================================================
// Engine: Lot Ranking
// ============================================================
// Sorts lots by shelf-life estimate to produce the "Sell First" list.
// Primary sort: lowDays ascending (most urgent first).
// Secondary sort: remainingDays ascending as tiebreaker.
// ============================================================

import type { Lot, Reading, ProduceMeta, RankedLot, ShelfLifeEstimate, AlertThresholds } from '@/types';
import { computeShelfLifeEstimate } from './shelfLife';

/**
 * rankLots
 *
 * Takes all lots, all readings, and produce metadata, and returns
 * a ranked array of lots — most urgent (least shelf life) first.
 *
 * This is the core of the "Sell First" decision.
 */
export function rankLots(
  lots: Lot[],
  readings: Reading[],
  produceMeta: ProduceMeta[],
  alertThresholds?: AlertThresholds
): RankedLot[] {
  const estimates: (ShelfLifeEstimate & { lot: Lot })[] = lots.map(lot => {
    const meta = produceMeta.find(m => m.produce === lot.produce) ?? defaultMeta(lot.produce);
    const estimate = computeShelfLifeEstimate(lot, readings, meta, alertThresholds);
    return { ...estimate, lot };
  });

  // Sort by urgency bucket first, then by lowDays, then remainingDays
  const urgencyOrder = { red: 0, amber: 1, green: 2 };
  const sorted = estimates.sort((a, b) => {
    const uA = urgencyOrder[a.urgency];
    const uB = urgencyOrder[b.urgency];
    if (uA !== uB) return uA - uB;
    if (a.lowDays !== b.lowDays) return a.lowDays - b.lowDays;
    return a.remainingDays - b.remainingDays;
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * defaultMeta – fallback if produce not in library.
 * Uses conservative shelf-life assumptions.
 */
function defaultMeta(produce: string): ProduceMeta {
  return {
    produce,
    idealTempC: 5,
    idealHumidity: 85,
    baseShelfLifeDays: 14,
    q10Factor: 2.0,
    notes: 'Default parameters – validate with actual data.',
  };
}
