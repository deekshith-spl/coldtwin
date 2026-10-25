// ============================================================
// Engine: Fault Detection
// ============================================================
// Detects equipment faults by combining three statistical signals:
//
// 1. EWMA residual deviation  – smoothed actual-vs-expected gap
// 2. Recovery time check      – how long after a door open before
//                               temperature returns to target
// 3. Compressor duty cycle    – ratio of runtime; short-cycling
//                               is many on/off cycles in short windows
//
// Each signal produces a 0–100 sub-score.
// The final fault-risk score is a weighted combination.
// A plain-English reason and suggested action are returned so the
// owner understands why the alert fired.
// ============================================================

import type { Chamber, Reading, ThermalPrediction, FaultAlert } from '@/types';

// EWMA smoothing factor (0 = no smoothing, 1 = no memory)
const EWMA_ALPHA = 0.3;

// Z-score window (readings) – roughly 24 hours of hourly data
const Z_WINDOW = 24;

// Alert threshold on smoothed residual (°C)
const RESIDUAL_ALERT_C = 1.5;

// Expected recovery time after door open (hours)
const RECOVERY_THRESHOLD_HOURS = 2;

// Healthy duty-cycle range (fraction of interval the compressor runs)
const DUTY_MIN = 0.3;
const DUTY_MAX = 0.75;

// Short-cycling: if residual swings ≥ this many times in Z_WINDOW, flag it
const SHORT_CYCLE_COUNT_THRESHOLD = 5;

/**
 * computeEwma – exponentially weighted moving average of an array.
 * Each value is smoothed toward the previous smoothed value.
 */
function computeEwma(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * rollingZScore – z-score of each point relative to the trailing window.
 * Returns 0 when the window is too small.
 */
function rollingZScore(values: number[], window: number): number[] {
  return values.map((v, i) => {
    if (i < 2) return 0;
    const slice = values.slice(Math.max(0, i - window), i);
    const mean = slice.reduce((s, x) => s + x, 0) / slice.length;
    const variance = slice.reduce((s, x) => s + (x - mean) ** 2, 0) / slice.length;
    const std = Math.sqrt(variance);
    return std < 0.01 ? 0 : (v - mean) / std;
  });
}

interface FaultSignals {
  residualScore: number;      // 0–100 from EWMA residual
  recoveryScore: number;      // 0–100 from recovery time analysis
  dutyCycleScore: number;     // 0–100 from compressor duty
  smoothedResiduals: number[];
  zScores: number[];
  reasons: string[];
  actions: string[];
}

function analyseSignals(
  chamber: Chamber,
  readings: Reading[],
  predictions: ThermalPrediction[]
): FaultSignals {
  const residuals = readings.map((r, i) => predictions[i]?.residual ?? 0);
  const smoothed = computeEwma(residuals, EWMA_ALPHA);
  const zScores  = rollingZScore(residuals, Z_WINDOW);
  const reasons: string[] = [];
  const actions: string[] = [];

  // ── Signal 1: Residual deviation ─────────────────────────
  const recentSmoothed = smoothed.slice(-12);
  const maxSmoothed = Math.max(...recentSmoothed.map(Math.abs));
  let residualScore = 0;

  if (maxSmoothed > RESIDUAL_ALERT_C) {
    residualScore = Math.min(100, (maxSmoothed / RESIDUAL_ALERT_C) * 50);
    const sign = smoothed[smoothed.length - 1] > 0 ? 'higher' : 'lower';
    reasons.push(
      `Temperature is running ${maxSmoothed.toFixed(1)}°C ${sign} than the twin expects — ` +
      `possible insulation or coil issue.`
    );
    actions.push('Inspect door seals, evaporator coils, and condenser fins.');
  }

  // Check z-score for short-cycling pattern
  const highZCount = zScores.slice(-Z_WINDOW).filter(z => Math.abs(z) > 2).length;
  if (highZCount >= SHORT_CYCLE_COUNT_THRESHOLD) {
    residualScore = Math.min(100, residualScore + 20);
    reasons.push(`Residual spiked ${highZCount} times in the last 24 readings (z > 2).`);
    actions.push('Check for refrigerant leaks or compressor short-cycling.');
  }

  // ── Signal 2: Recovery time after door opens ─────────────
  let recoveryScore = 0;
  let slowRecoveries = 0;
  const totalDoorEvents = readings.reduce((s, r) => s + r.doorOpenCount, 0);

  for (let i = 0; i < readings.length; i++) {
    if (readings[i].doorOpenCount > 0) {
      // Find how many steps until residual falls back below 0.5°C
      let recovered = false;
      for (let j = i + 1; j < Math.min(i + 10, readings.length); j++) {
        const hoursElapsed = (j - i) * (readings[i].intervalHours || 1);
        if (Math.abs(smoothed[j]) < 0.5) { recovered = true; break; }
        if (hoursElapsed > RECOVERY_THRESHOLD_HOURS * 2) break;
      }
      if (!recovered) slowRecoveries++;
    }
  }

  if (totalDoorEvents > 0 && slowRecoveries > 0) {
    recoveryScore = Math.min(100, (slowRecoveries / Math.max(totalDoorEvents, 1)) * 200);
    reasons.push(
      `${chamber.name} took unusually long to cool down after ${slowRecoveries} door-open event(s). ` +
      `This may indicate a weak compressor or damaged door seal.`
    );
    actions.push('Inspect door seal gasket and check compressor capacity.');
  }

  // ── Signal 3: Compressor duty cycle ──────────────────────
  let dutyCycleScore = 0;
  const totalHours = readings.reduce((s, r) => s + (r.intervalHours || 1), 0);
  const runHours   = readings.reduce((s, r) => s + r.compressorRunHours, 0);
  const dutyCycle  = totalHours > 0 ? runHours / totalHours : 0;

  if (dutyCycle > DUTY_MAX) {
    dutyCycleScore = Math.min(100, ((dutyCycle - DUTY_MAX) / (1 - DUTY_MAX)) * 100);
    reasons.push(
      `Compressor duty cycle is ${(dutyCycle * 100).toFixed(0)}% — ` +
      `above the healthy range of ${DUTY_MAX * 100}%. ` +
      `The refrigeration system is working harder than normal.`
    );
    actions.push('Check refrigerant charge and clean condenser coils.');
  } else if (dutyCycle < DUTY_MIN && totalHours > 12) {
    dutyCycleScore = Math.min(50, ((DUTY_MIN - dutyCycle) / DUTY_MIN) * 50);
    reasons.push(
      `Compressor duty cycle is ${(dutyCycle * 100).toFixed(0)}% — ` +
      `below normal. May indicate a faulty sensor or compressor not starting.`
    );
    actions.push('Verify compressor is starting normally and check run-hour sensors.');
  }

  return { residualScore, recoveryScore, dutyCycleScore, smoothedResiduals: smoothed, zScores, reasons, actions };
}

/**
 * computeFaultAlert
 *
 * Main function: given a chamber, its readings, and the thermal twin's
 * predictions, produce a FaultAlert with a 0–100 risk score and a
 * plain-English explanation of the top contributing factors.
 *
 * Weights: residual 45%, recovery time 35%, duty cycle 20%
 */
export function computeFaultAlert(
  chamber: Chamber,
  readings: Reading[],
  predictions: ThermalPrediction[]
): FaultAlert {
  if (readings.length < 3) {
    return {
      chamberId: chamber.id,
      riskScore: 0,
      level: 'green',
      reason: 'Not enough readings yet to assess fault risk.',
      suggestedAction: 'Enter at least 3 hourly readings.',
      topFactors: [],
      timestamp: new Date().toISOString(),
    };
  }

  const signals = analyseSignals(chamber, readings, predictions);

  const riskScore = Math.min(
    100,
    Math.round(
      0.45 * signals.residualScore +
      0.35 * signals.recoveryScore +
      0.20 * signals.dutyCycleScore
    )
  );

  const level = riskScore >= 60 ? 'red' : riskScore >= 30 ? 'amber' : 'green';

  const reason = signals.reasons.length > 0
    ? signals.reasons[0]
    : `${chamber.name} is operating normally.`;

  const suggestedAction = signals.actions.length > 0
    ? signals.actions[0]
    : 'No action required. Continue monitoring.';

  return {
    chamberId: chamber.id,
    riskScore,
    level,
    reason,
    suggestedAction,
    topFactors: signals.reasons,
    timestamp: new Date().toISOString(),
  };
}

/**
 * injectFaultPattern
 *
 * Adds a synthetic fault pattern to an array of readings so the
 * fault detection engine reacts visibly.
 * Used by the "Simulate a fault" feature in the Digital Twin page.
 */
export function injectFaultPattern(
  readings: Reading[],
  faultType: 'blocked_coil' | 'door_left_open' | 'short_cycling',
  startIndex: number = 0
): Reading[] {
  const patched = readings.map((r, i) => ({ ...r }));

  for (let i = startIndex; i < Math.min(startIndex + 24, patched.length); i++) {
    const r = patched[i];
    switch (faultType) {
      case 'blocked_coil':
        // Blocked coil: gradual temperature rise, compressor runs hard
        r.tempC += 0.15 * (i - startIndex + 1);
        r.compressorRunHours = Math.min(r.intervalHours || 1, r.compressorRunHours + 0.2);
        break;
      case 'door_left_open':
        // Door left open: sudden heat spike, slow recovery
        if (i === startIndex) r.doorOpenCount += 3;
        r.tempC += 0.8 * Math.exp(-0.2 * (i - startIndex));
        break;
      case 'short_cycling':
        // Short cycling: residual oscillates rapidly
        r.tempC += (i % 2 === 0 ? 0.8 : -0.5);
        r.compressorRunHours = i % 2 === 0 ? 0.1 : (r.intervalHours || 1) - 0.1;
        break;
    }
  }

  return patched;
}
