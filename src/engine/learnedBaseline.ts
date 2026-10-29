// ============================================================
// Engine: Learned Baseline Anomaly Detector
// ============================================================
// Learns diurnal (hour-of-day) temperature residual normal patterns
// (median and median absolute deviation [MAD]) from earlier chamber readings.
// For recent readings, computes a robust anomaly score against that chamber's
// own historical baseline.
// ============================================================

import type { Chamber, Reading, ThermalPrediction, AlertThresholds } from '@/types';

export interface HourlyBaseline {
  hour: number;          // 0..23
  median: number;        // Median residual (°C)
  mad: number;           // Median Absolute Deviation (°C)
  count: number;         // Sample count in training set
}

export interface ChamberBaseline {
  chamberId: string;
  hourly: Record<number, HourlyBaseline>;
  overallMedian: number;
  overallMad: number;
  baselineReadingCount: number;
}

export interface LearnedAnomalyResult {
  anomalyScore: number;       // 0–100 robust anomaly score
  peakDeviation: number;      // Maximum residual deviation from baseline in recent window (°C)
  peakZ: number;              // Peak robust z-score in recent window
  reason?: string;            // Plain-language reason if anomalous
  suggestedAction?: string;   // Recommended operator action
}

export interface LearnedBandPoint {
  lower: number;              // Lower bound of learned normal band (°C)
  upper: number;              // Upper bound of learned normal band (°C)
  base: number;               // Lower bound (base for stacked Area in Recharts)
  band: number;               // Band width (upper - lower)
}

/**
 * median - robust central tendency of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * mad - Median Absolute Deviation from the median:
 *   MAD = median(|X_i - median(X)|)
 */
export function mad(values: number[], medValue?: number): number {
  if (values.length === 0) return 0;
  const center = medValue ?? median(values);
  const deviations = values.map(v => Math.abs(v - center));
  return median(deviations);
}

/**
 * learnChamberBaseline
 *
 * Trains a diurnal baseline for a chamber from the earlier part of its readings.
 * Residuals (actual minus expected temperature) are grouped by hour-of-day (0..23).
 * Returns the median and MAD for each hour.
 */
export function learnChamberBaseline(
  chamberId: string,
  readings: Reading[],
  predictions: ThermalPrediction[]
): ChamberBaseline {
  const n = readings.length;
  // If insufficient readings, return default empty baseline
  if (n < 6) {
    const defaultHourly: Record<number, HourlyBaseline> = {};
    for (let h = 0; h < 24; h++) {
      defaultHourly[h] = { hour: h, median: 0, mad: 0.2, count: 0 };
    }
    return {
      chamberId,
      hourly: defaultHourly,
      overallMedian: 0,
      overallMad: 0.2,
      baselineReadingCount: 0,
    };
  }

  // Sort readings chronologically
  const indexed = readings.map((r, i) => ({
    reading: r,
    prediction: predictions[i] ?? { residual: 0, expectedTempC: r.tempC },
  })).sort(
    (a, b) => new Date(a.reading.timestamp).getTime() - new Date(b.reading.timestamp).getTime()
  );

  // Define earlier training window:
  // For long series (>= 96 readings), use first 50% or readings prior to trailing 48h.
  // For medium series (24..95), use the first 50%.
  // For shorter series, use the first 60%.
  let trainingCutoff = Math.floor(n * 0.5);
  if (n >= 96) {
    trainingCutoff = Math.min(Math.floor(n * 0.5), n - 48);
  } else if (n >= 24) {
    trainingCutoff = Math.floor(n * 0.5);
  } else {
    trainingCutoff = Math.max(6, Math.floor(n * 0.6));
  }

  const baselineSlice = indexed.slice(0, trainingCutoff);
  const allBaselineResiduals = baselineSlice.map(x => x.prediction.residual);
  const overallMed = parseFloat(median(allBaselineResiduals).toFixed(2));
  const overallMadVal = parseFloat(Math.max(mad(allBaselineResiduals, overallMed), 0.15).toFixed(2));

  // Group residuals by hour-of-day
  const hourBuckets: Record<number, number[]> = {};
  for (let h = 0; h < 24; h++) {
    hourBuckets[h] = [];
  }

  for (const item of baselineSlice) {
    const d = new Date(item.reading.timestamp);
    const hour = d.getHours();
    hourBuckets[hour].push(item.prediction.residual);
  }

  const hourly: Record<number, HourlyBaseline> = {};
  for (let h = 0; h < 24; h++) {
    const residuals = hourBuckets[h];
    if (residuals.length > 0) {
      const med = median(residuals);
      // Floor MAD at 0.15°C to avoid near-zero division on synthetic low-noise series
      const m = Math.max(mad(residuals, med), 0.15);
      hourly[h] = {
        hour: h,
        median: parseFloat(med.toFixed(2)),
        mad: parseFloat(m.toFixed(2)),
        count: residuals.length,
      };
    } else {
      hourly[h] = {
        hour: h,
        median: overallMed,
        mad: overallMadVal,
        count: 0,
      };
    }
  }

  return {
    chamberId,
    hourly,
    overallMedian: overallMed,
    overallMad: overallMadVal,
    baselineReadingCount: baselineSlice.length,
  };
}

/**
 * computeLearnedAnomalyScore
 *
 * Evaluates recent readings against the chamber's learned diurnal baseline.
 * Computes robust z-scores relative to MAD and deviation thresholds, returning
 * a 0–100 anomaly score and plain-language explanation when anomalous.
 */
export function computeLearnedAnomalyScore(
  chamber: Chamber,
  readings: Reading[],
  predictions: ThermalPrediction[],
  baseline: ChamberBaseline,
  alertThresholds?: AlertThresholds
): LearnedAnomalyResult {
  if (readings.length < 6 || baseline.baselineReadingCount === 0) {
    return {
      anomalyScore: 0,
      peakDeviation: 0,
      peakZ: 0,
    };
  }

  // Focus on the recent evaluation window (last 24 readings, or up to half the series)
  const recentCount = Math.min(24, Math.max(6, Math.floor(readings.length * 0.5)));
  const recentReadings = readings.slice(-recentCount);
  const recentPredictions = predictions.slice(-recentCount);

  const tempDevLimit = alertThresholds?.tempDeviationAlert ?? 2.0;
  let peakDeviation = 0;
  let peakZ = 0;
  let peakResidual = 0;

  for (let i = 0; i < recentReadings.length; i++) {
    const r = recentReadings[i];
    const p = recentPredictions[i];
    if (!p) continue;

    const hour = new Date(r.timestamp).getHours();
    const hBase = baseline.hourly[hour] ?? {
      hour,
      median: baseline.overallMedian,
      mad: baseline.overallMad,
      count: 0,
    };

    // Robust dispersion scale: 1.4826 * MAD approximates standard deviation for normal data
    const robustSigma = Math.max(1.4826 * hBase.mad, 0.15);
    const deviation = Math.abs(p.residual - hBase.median);
    const z = deviation / robustSigma;

    if (deviation > peakDeviation) peakDeviation = deviation;
    if (z > peakZ) peakZ = z;
    if (Math.abs(p.residual) > peakResidual) peakResidual = Math.abs(p.residual);
  }

  peakDeviation = parseFloat(peakDeviation.toFixed(2));
  peakZ = parseFloat(peakZ.toFixed(2));
  peakResidual = parseFloat(peakResidual.toFixed(2));

  // Determine anomaly score (0–100):
  // - Nominal readings: residual near zero or deviation < 0.5 * limit and z <= 2.5 -> score 0..15
  // - Elevated/anomalous readings: deviation >= limit and residual >= 0.5 * limit -> score 60..100
  // - Intermediate readings: 0.5 * limit <= deviation < limit -> score 15..45
  let anomalyScore = 0;
  if (peakResidual < 0.5 * tempDevLimit || (peakDeviation < 0.5 * tempDevLimit && peakZ <= 2.5)) {
    anomalyScore = Math.min(15, Math.round(Math.min(peakZ, 3) * 4));
  } else if (peakDeviation >= tempDevLimit && peakResidual >= 0.5 * tempDevLimit) {
    const excess = peakDeviation / tempDevLimit;
    const zExcess = Math.min(10, Math.max(0, peakZ - 2.5) * 3);
    anomalyScore = Math.min(100, Math.round(60 + (excess - 1) * 35 + zExcess));
  } else {
    // Intermediate deviation (between 0.5 * limit and limit)
    const ratio = peakDeviation / tempDevLimit;
    anomalyScore = Math.min(45, Math.round(15 + ratio * 25));
  }

  let reason: string | undefined;
  let suggestedAction: string | undefined;

  if (anomalyScore >= 50 && peakDeviation >= tempDevLimit && peakResidual >= 0.5 * tempDevLimit) {
    reason = `${chamber.name} is behaving unlike its own usual pattern at this hour.`;
    suggestedAction = 'Inspect chamber door seals, sensor calibration, and thermal loading for this hour of day.';
  }

  return {
    anomalyScore,
    peakDeviation,
    peakZ,
    reason,
    suggestedAction,
  };
}

/**
 * computeLearnedBandPoint
 *
 * Given a thermal prediction and the chamber's baseline, calculates
 * the learned normal band (lower bound and band width) for chart rendering.
 */
export function computeLearnedBandPoint(
  timestamp: string,
  expectedTempC: number,
  baseline: ChamberBaseline,
  devThreshold: number = 2.0
): LearnedBandPoint {
  const hour = new Date(timestamp).getHours();
  const hBase = baseline.hourly[hour] ?? {
    hour,
    median: baseline.overallMedian,
    mad: baseline.overallMad,
    count: 0,
  };

  // Center of learned normal pattern = expected temp + learned median residual
  const center = expectedTempC + hBase.median;

  // Robust band half-width: 2.5 * (1.4826 * MAD), floored at 0.5°C and scaled with devThreshold
  const robustScale = Math.max(1.4826 * hBase.mad, 0.2);
  const halfWidth = Math.max(0.5, Math.min(2.5 * robustScale, Math.max(devThreshold * 0.9, 0.8)));

  const lower = parseFloat((center - halfWidth).toFixed(2));
  const upper = parseFloat((center + halfWidth).toFixed(2));
  const band = parseFloat((upper - lower).toFixed(2));

  return {
    lower,
    upper,
    base: lower,
    band,
  };
}
