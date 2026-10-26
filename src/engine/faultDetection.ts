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

import type { Chamber, Reading, ThermalPrediction, FaultAlert, AlertThresholds, UrgencyLevel } from '@/types';

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

export function analyseSignals(
  chamber: Chamber,
  readings: Reading[],
  predictions: ThermalPrediction[],
  alertThresholds?: AlertThresholds
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
  const tempDevLimit = alertThresholds?.tempDeviationAlert ?? RESIDUAL_ALERT_C;

  if (maxSmoothed > tempDevLimit) {
    const excess = maxSmoothed / tempDevLimit;
    residualScore = Math.min(100, Math.round(60 + (excess - 1) * 40));
    const sign = smoothed[smoothed.length - 1] > 0 ? 'higher' : 'lower';
    reasons.push(
      `Temperature is running ${maxSmoothed.toFixed(1)}°C ${sign} than the twin expects (threshold: ${tempDevLimit}°C) — ` +
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

  // ── Signal 3: Compressor duty cycle (use recent window: last 24-48 hours) ──
  let dutyCycleScore = 0;
  // Chronologically sort to ensure slice accurately captures the trailing window (last 24-48 hours)
  const sortedByTime = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const recentDutyReadings = sortedByTime.slice(-48);
  const totalHours = recentDutyReadings.reduce((s, r) => s + (r.intervalHours || 1), 0);
  const runHours   = recentDutyReadings.reduce((s, r) => s + r.compressorRunHours, 0);
  const dutyCycle  = totalHours > 0 ? runHours / totalHours : 0;

  if (dutyCycle > DUTY_MAX) {
    dutyCycleScore = Math.min(100, ((dutyCycle - DUTY_MAX) / (1 - DUTY_MAX)) * 100);
    reasons.push(
      `Compressor duty cycle is ${(dutyCycle * 100).toFixed(0)}% in recent window — ` +
      `above the healthy range of ${DUTY_MAX * 100}%. ` +
      `The refrigeration system is working harder than normal.`
    );
    actions.push('Check refrigerant charge and clean condenser coils.');
  } else if (dutyCycle < DUTY_MIN && totalHours > 12) {
    dutyCycleScore = Math.min(50, ((DUTY_MIN - dutyCycle) / DUTY_MIN) * 50);
    reasons.push(
      `Compressor duty cycle is ${(dutyCycle * 100).toFixed(0)}% in recent window — ` +
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
  predictions: ThermalPrediction[],
  alertThresholds?: AlertThresholds
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

  const signals = analyseSignals(chamber, readings, predictions, alertThresholds);

  const riskScore = Math.min(
    100,
    Math.round(
      0.45 * signals.residualScore +
      0.35 * signals.recoveryScore +
      0.20 * signals.dutyCycleScore
    )
  );

  const riskAlert = alertThresholds?.riskScoreAlert ?? 60;
  const warningAlert = Math.round(riskAlert / 2);
  let level: UrgencyLevel = riskScore >= riskAlert ? 'red' : riskScore >= warningAlert ? 'amber' : 'green';
  if (signals.residualScore >= 60 && level === 'green') {
    level = 'amber';
  }

  // Prioritize the primary reason and action corresponding to the dominant fault signal
  let reason = `${chamber.name} is operating normally.`;
  let suggestedAction = 'No action required. Continue monitoring.';

  const contributions = [
    { score: 0.45 * signals.residualScore, idx: signals.reasons.findIndex(r => r.includes('Expected') || r.includes('deviation') || r.includes('warmer') || r.includes('cooler')) },
    { score: 0.35 * signals.recoveryScore, idx: signals.reasons.findIndex(r => r.includes('door-open')) },
    { score: 0.20 * signals.dutyCycleScore, idx: signals.reasons.findIndex(r => r.includes('duty cycle')) },
  ].filter(c => c.idx !== -1);

  contributions.sort((a, b) => b.score - a.score);

  if (contributions.length > 0) {
    const dominant = contributions[0];
    reason = signals.reasons[dominant.idx];
    suggestedAction = signals.actions[dominant.idx] || signals.actions[0] || suggestedAction;
  } else if (signals.reasons.length > 0) {
    reason = signals.reasons[0];
    suggestedAction = signals.actions[0] || suggestedAction;
  }

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
  startIndex?: number
): Reading[] {
  const patched = readings.map(r => ({ ...r }));
  const actualStart = startIndex ?? Math.max(0, patched.length - 48);

  for (let i = actualStart; i < patched.length; i++) {
    const r = patched[i];
    const offset = i - actualStart;
    switch (faultType) {
      case 'blocked_coil':
        // Blocked coil: gradual temperature rise, compressor works overtime
        r.tempC += 0.15 * (offset + 1);
        r.compressorRunHours = Math.min(r.intervalHours || 1, 0.95);
        break;
      case 'door_left_open':
        // Door left open: heat spike, slow recovery
        if (offset === 0) r.doorOpenCount += 3;
        r.tempC += 2.0 * Math.exp(-0.08 * offset);
        r.compressorRunHours = Math.min(r.intervalHours || 1, r.compressorRunHours + 0.3);
        break;
      case 'short_cycling':
        // Short cycling: rapid compressor on/off, oscillating temperature
        r.tempC += (offset % 2 === 0 ? 1.5 : -1.0);
        r.compressorRunHours = offset % 2 === 0 ? 0.15 : (r.intervalHours || 1) - 0.15;
        break;
    }
  }

  return patched;
}
