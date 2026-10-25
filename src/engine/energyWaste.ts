// ============================================================
// Engine: Energy Waste Estimator
// ============================================================
// Estimates how much extra electricity a chamber is consuming
// compared to a healthy baseline, and converts it to ₹.
//
// Method:
//   1. Compute actual compressor run-hours over the period.
//   2. Compare to a "healthy" run-hours baseline
//      (healthy duty cycle × total hours).
//   3. Extra kWh = extraRunHours × compressorKW
//   4. Extra cost = extraKwh × tariff (₹/kWh)
//
// These are rough estimates. Real savings depend on load, ambient
// conditions, and many factors outside this model.
// ============================================================

import type { Chamber, Reading, EnergyWasteEstimate } from '@/types';

// A healthy cold store compressor runs ~50% of the time on average.
// This is the baseline duty cycle.
const HEALTHY_DUTY_CYCLE = 0.50;

/**
 * computeEnergyWaste
 *
 * Given a chamber and its readings over a period, computes the
 * estimated energy waste compared to a healthy baseline.
 *
 * @param tariffINR – electricity tariff in ₹ per kWh
 */
export function computeEnergyWaste(
  chamber: Chamber,
  readings: Reading[],
  tariffINR: number
): EnergyWasteEstimate {
  if (readings.length === 0) {
    return {
      chamberId: chamber.id,
      extraKwh: 0,
      extraCostINR: 0,
      reason: 'No readings available.',
    };
  }

  const totalHours = readings.reduce((s, r) => s + (r.intervalHours || 1), 0);
  const actualRunHours = readings.reduce((s, r) => s + r.compressorRunHours, 0);
  const healthyRunHours = HEALTHY_DUTY_CYCLE * totalHours;

  const extraRunHours = Math.max(0, actualRunHours - healthyRunHours);
  const extraKwh = extraRunHours * chamber.compressorKW;
  const extraCostINR = extraKwh * tariffINR;

  const actualDuty = totalHours > 0 ? (actualRunHours / totalHours * 100).toFixed(0) : '0';

  let reason = '';
  if (extraRunHours <= 0) {
    reason = `${chamber.name} compressor duty cycle (${actualDuty}%) is within healthy range. No excess energy use detected.`;
  } else {
    reason = `${chamber.name} compressor ran ${extraRunHours.toFixed(1)} extra hours ` +
      `(duty cycle: ${actualDuty}% vs healthy ${HEALTHY_DUTY_CYCLE * 100}%). ` +
      `Likely cause: poor insulation, high door-open frequency, or blocked coils.`;
  }

  return {
    chamberId: chamber.id,
    extraKwh: parseFloat(extraKwh.toFixed(2)),
    extraCostINR: parseFloat(extraCostINR.toFixed(2)),
    reason,
  };
}

/**
 * totalEnergyWaste
 * Sums up energy waste across all chambers.
 */
export function totalEnergyWaste(estimates: EnergyWasteEstimate[]): {
  totalExtraKwh: number;
  totalExtraCostINR: number;
} {
  return {
    totalExtraKwh: parseFloat(estimates.reduce((s, e) => s + e.extraKwh, 0).toFixed(2)),
    totalExtraCostINR: parseFloat(estimates.reduce((s, e) => s + e.extraCostINR, 0).toFixed(2)),
  };
}
