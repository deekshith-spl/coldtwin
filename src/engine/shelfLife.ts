// ============================================================
// Engine: Shelf-Life Model
// ============================================================
// Estimates how many days of shelf life remain for each lot.
//
// The key idea: produce quality degrades faster at higher temperatures
// and wrong humidity. We model this with a Q10-style rate factor:
//
//   dailyConsumptionRate = baseRate
//                        × Q10^((avgTemp - idealTemp) / 10)
//                        × humidityPenalty
//
// Where baseRate = 1/baseShelfLifeDays (if stored perfectly,
// 1/baseDays of life consumed each day).
//
// remainingLife starts at 1.0 (100%) and decreases each day.
// remainingDays = remainingLife / currentDailyRate
//
// DISCLAIMER: These are illustrative estimates.
// Real shelf life depends on variety, handling, initial quality,
// and many other factors not captured here.
// ============================================================

import type { Lot, Reading, ProduceMeta, ShelfLifeEstimate, AlertThresholds } from '@/types';

/**
 * humidityPenalty
 * Returns a multiplier > 1 when humidity deviates from ideal.
 * Very low humidity causes desiccation; very high causes mould.
 */
function humidityPenalty(actualHumidity: number, idealHumidity: number): number {
  const deviation = Math.abs(actualHumidity - idealHumidity);
  if (deviation <= 5)  return 1.0;
  if (deviation <= 10) return 1.05;
  if (deviation <= 20) return 1.15;
  return 1.30;
}

/**
 * computeDailyConsumptionRate
 * Returns the fraction of total shelf life consumed in one day
 * at the given temperature and humidity.
 */
export function computeDailyConsumptionRate(
  avgTempC: number,
  avgHumidity: number,
  meta: ProduceMeta
): number {
  const baseRate = 1 / meta.baseShelfLifeDays;
  const tempDelta = Math.max(0, avgTempC - meta.idealTempC);
  const q10Rate   = Math.pow(meta.q10Factor, tempDelta / 10);
  const humRate   = humidityPenalty(avgHumidity, meta.idealHumidity);

  // Chilling injury penalty: penalise temperatures below safe minimum
  let chillingPenalty = 1.0;
  if (meta.minSafeTempC !== undefined && avgTempC < meta.minSafeTempC) {
    const chillingDelta = meta.minSafeTempC - avgTempC;
    // Each degree below safe minimum adds a penalty reflecting chilling injury
    chillingPenalty = 1 + chillingDelta * 0.25;
  }

  return baseRate * q10Rate * humRate * chillingPenalty;
}

/**
 * computeShelfLifeEstimate
 *
 * Given a lot and its chamber's readings since arrival, computes:
 * - remainingDays (central estimate)
 * - lowDays (pessimistic – assumes conditions worsen slightly)
 * - highDays (optimistic – assumes conditions improve slightly)
 * - urgency level
 * - a plain-English explanation
 *
 * Uncertainty band widens by ±10% per day of missing data.
 */
export function computeShelfLifeEstimate(
  lot: Lot,
  readings: Reading[],
  meta: ProduceMeta,
  alertThresholds?: AlertThresholds
): ShelfLifeEstimate {
  const arrivalMs = new Date(lot.arrivalDate).getTime();

  // Filter readings for this chamber after arrival
  const lotReadings = readings
    .filter(r =>
      r.chamberId === lot.chamberId &&
      new Date(r.timestamp).getTime() >= arrivalMs
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (lotReadings.length === 0) {
    // No readings: return full baseline with wide uncertainty
    return {
      lotId: lot.id,
      remainingDays: meta.baseShelfLifeDays,
      lowDays: Math.round(meta.baseShelfLifeDays * 0.7),
      highDays: meta.baseShelfLifeDays,
      urgency: deriveUrgency(meta.baseShelfLifeDays, alertThresholds),
      dailyConsumptionRate: 1 / meta.baseShelfLifeDays,
      explanation:
        `No chamber readings found. Using full baseline of ${meta.baseShelfLifeDays} days. ` +
        `Please add daily readings for a better estimate.`,
    };
  }

  // Accumulate life consumed using daily-average readings
  // Group readings by day
  const byDay = new Map<string, Reading[]>();
  for (const r of lotReadings) {
    const day = r.timestamp.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
  }

  let remainingLife = 1.0; // starts at 100%
  let lastRate = 1 / meta.baseShelfLifeDays;

  for (const dayReadings of byDay.values()) {
    const avgTemp = dayReadings.reduce((s, r) => s + r.tempC, 0) / dayReadings.length;
    const avgHum  = dayReadings.reduce((s, r) => s + r.humidity, 0) / dayReadings.length;
    const rate    = computeDailyConsumptionRate(avgTemp, avgHum, meta);
    remainingLife -= rate;
    lastRate = rate;
  }

  remainingLife = Math.max(0, remainingLife);

  const remainingDays = lastRate > 0 ? remainingLife / lastRate : 0;

  // Uncertainty: ±15% per day of missing data (capped at ±40%)
  const daysCovered = byDay.size;
  const totalDaysInStore = Math.max(1,
    (Date.now() - arrivalMs) / (1000 * 60 * 60 * 24)
  );
  const missingFraction = Math.max(0, 1 - daysCovered / totalDaysInStore);
  const uncertainty = Math.min(0.4, 0.15 * missingFraction * totalDaysInStore);

  const lowDays  = Math.max(0, Math.round(remainingDays * (1 - uncertainty - 0.1)));
  const highDays = Math.round(remainingDays * (1 + uncertainty));

  // Build explanation
  const avgTempAll = lotReadings.reduce((s, r) => s + r.tempC, 0) / lotReadings.length;
  const tempDiff = avgTempAll - meta.idealTempC;
  let explanation = `Lot stored for ${daysCovered} day(s). Average temp: ${avgTempAll.toFixed(1)}°C `;
  explanation += `(ideal: ${meta.idealTempC}°C). `;
  if (meta.minSafeTempC !== undefined && avgTempAll < meta.minSafeTempC) {
    const chillingDiff = (meta.minSafeTempC - avgTempAll).toFixed(1);
    explanation += `Temperature is ${chillingDiff}°C below safe minimum (${meta.minSafeTempC}°C) causing chilling injury. `;
  } else if (tempDiff > 0.5) {
    explanation += `Temperature ${tempDiff.toFixed(1)}°C above ideal accelerates aging. `;
  } else if (tempDiff < -0.5) {
    explanation += `Slightly cooler than ideal — good for preservation. `;
  }
  if (uncertainty > 0.1) {
    explanation += `Estimate has wider uncertainty (±${Math.round(uncertainty * 100)}%) due to missing readings.`;
  }

  return {
    lotId: lot.id,
    remainingDays: Math.max(0, parseFloat(remainingDays.toFixed(1))),
    lowDays,
    highDays,
    urgency: deriveUrgency(lowDays, alertThresholds),
    dailyConsumptionRate: lastRate,
    explanation,
  };
}

export function deriveUrgency(
  days: number,
  alertThresholds?: AlertThresholds
): 'red' | 'amber' | 'green' {
  const redDays = alertThresholds?.shelfLifeRedDays ?? 3;
  const amberDays = alertThresholds?.shelfLifeAmberDays ?? 7;
  if (days < redDays) return 'red';
  if (days < amberDays) return 'amber';
  return 'green';
}
