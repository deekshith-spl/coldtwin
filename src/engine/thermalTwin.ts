// ============================================================
// Engine: Thermal Twin Model
// ============================================================
// Simple first-order thermal model per chamber.
// The temperature drifts toward ambient air temperature,
// is pulled down by the compressor, and gets a heat pulse
// each time the door opens.
//
// Discrete update equation (per interval of dt hours):
//   T(t+dt) = T(t) + alpha*dt*(T_ambient - T(t))
//             - beta*dt*compressorOn
//             + gamma*doorOpenCount
//
// Parameters (tunable in future versions):
//   alpha  – thermal leakage constant (°C/hr per °C difference)
//   beta   – compressor cooling rate (°C/hr when running)
//   gamma  – heat pulse per door-open event (°C)
// ============================================================

import type { Chamber, Reading, ThermalPrediction } from '@/types';

// Thermal leakage constant – how fast temperature drifts toward ambient
// (fraction of the gap closed per hour)
const ALPHA = 0.04;

// Compressor cooling rate: °C pulled down per hour of compressor runtime
const BETA = 1.5;

// Heat added per door-open event (°C)
const GAMMA = 0.6;

export interface ThermalParams {
  alpha?: number;
  beta?: number;
  gamma?: number;
}

/**
 * computeThermalPredictions
 *
 * Given a chamber definition and its sorted readings, produce the
 * expected temperature at each timestamp using the thermal twin model.
 * Returns an array of ThermalPrediction aligned with the input readings.
 *
 * The first reading's actual temperature is used as the starting state
 * (we assume the twin is "warm-started" from reality).
 */
export function computeThermalPredictions(
  chamber: Chamber,
  readings: Reading[],
  params: ThermalParams = {}
): ThermalPrediction[] {
  if (readings.length === 0) return [];

  const alpha = params.alpha ?? ALPHA;
  const beta  = params.beta  ?? BETA;
  const gamma = params.gamma ?? GAMMA;

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const predictions: ThermalPrediction[] = [];

  // Warm-start the twin from the first actual reading
  let expectedT = sorted[0].tempC;

  for (const reading of sorted) {
    const dt = reading.intervalHours || 1;
    const compOn = reading.compressorRunHours > 0;

    // Thermal drift toward ambient
    const drift = alpha * dt * (chamber.ambientTempC - expectedT);

    // Compressor cooling (only counts if compressor ran during interval)
    const cooling = compOn ? beta * reading.compressorRunHours : 0;

    // Heat pulse from door openings
    const doorHeat = gamma * reading.doorOpenCount;

    // Update expected temperature
    expectedT = expectedT + drift - cooling + doorHeat;

    // Clamp to physically plausible range
    expectedT = Math.max(-5, Math.min(chamber.ambientTempC, expectedT));

    const residual = reading.tempC - expectedT;

    // State estimator / observer update: gently nudge twin state toward actual observation
    // to prevent open-loop accumulation over hundreds of hours, while preserving residual sensitivity
    expectedT = expectedT + 0.35 * residual;

    predictions.push({
      chamberId: chamber.id,
      timestamp: reading.timestamp,
      expectedTempC: parseFloat((reading.tempC - residual).toFixed(2)),
      residual: parseFloat(residual.toFixed(2)),
    });
  }

  return predictions;
}

/**
 * getResiduals
 * Convenience helper to extract just the residual array.
 */
export function getResiduals(predictions: ThermalPrediction[]): number[] {
  return predictions.map(p => p.residual);
}
