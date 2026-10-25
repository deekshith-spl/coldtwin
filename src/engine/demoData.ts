// ============================================================
// Demo Data Generator
// ============================================================
// Generates 60 days of realistic synthetic data for 4 chambers
// and 12 lots (potato, apple, onion, chilli) across 4 farmers.
//
// Two injected faults:
//   1. Blocked coil in Chamber 2 starting day 30
//   2. Door left open event in Chamber 3 on day 45
//
// All values are synthetic and do NOT represent a real cold store.
// ============================================================

import type { Chamber, Reading, Lot, ProduceMeta, Farmer } from '@/types';

// ── Produce library ──────────────────────────────────────────
export const DEFAULT_PRODUCE_META: ProduceMeta[] = [
  {
    produce: 'potato',
    idealTempC: 4,
    idealHumidity: 90,
    baseShelfLifeDays: 90,
    q10Factor: 2.5,
    notes: 'Store in dark to prevent greening. Avoid freezing.',
  },
  {
    produce: 'apple',
    idealTempC: 1,
    idealHumidity: 92,
    baseShelfLifeDays: 60,
    q10Factor: 3.0,
    notes: 'Ethylene producer – store away from other produce.',
  },
  {
    produce: 'onion',
    idealTempC: 2,
    idealHumidity: 70,
    baseShelfLifeDays: 120,
    q10Factor: 2.0,
    notes: 'Low humidity required. Curing before storage important.',
  },
  {
    produce: 'chilli',
    idealTempC: 8,
    idealHumidity: 90,
    baseShelfLifeDays: 21,
    q10Factor: 2.8,
    minSafeTempC: 7,
    notes: 'Chilling injury below 7°C. Monitor closely.',
  },
];

// ── Chambers ─────────────────────────────────────────────────
export const DEMO_CHAMBERS: Chamber[] = [
  { id: 'C1', name: 'Chamber 1 – Potato', targetTempC: 4,  ambientTempC: 32, compressorKW: 7.5 },
  { id: 'C2', name: 'Chamber 2 – Apple',  targetTempC: 1,  ambientTempC: 32, compressorKW: 7.5 },
  { id: 'C3', name: 'Chamber 3 – Mixed',  targetTempC: 5,  ambientTempC: 32, compressorKW: 5.5 },
  { id: 'C4', name: 'Chamber 4 – Chilli', targetTempC: 8,  ambientTempC: 32, compressorKW: 5.5 },
];

// ── Farmers ──────────────────────────────────────────────────
export const DEMO_FARMERS: Farmer[] = [
  { id: 'F1', name: 'Raju Naidu',     phone: '9876543210' },
  { id: 'F2', name: 'Sunita Devi',    phone: '9865432101' },
  { id: 'F3', name: 'Venkat Reddy',   phone: '9754321012' },
  { id: 'F4', name: 'Priya Kumari',   phone: '9643210123' },
];

// ── Helper: Gaussian noise ────────────────────────────────────
function randn(mean: number, std: number): number {
  // Box–Muller transform
  const u = Math.random(), v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * std;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── Lots ─────────────────────────────────────────────────────
function makeLots(baseDate: Date): Lot[] {
  const d = (offset: number) => {
    const dt = new Date(baseDate);
    dt.setDate(dt.getDate() - offset);
    return dt.toISOString().slice(0, 10);
  };

  return [
    // Chamber 1 – Potato
    { id: 'L01', produce: 'potato', quantityKg: 5000, arrivalDate: d(50), farmerId: 'F1', farmerName: 'Raju Naidu',   chamberId: 'C1' },
    { id: 'L02', produce: 'potato', quantityKg: 3000, arrivalDate: d(30), farmerId: 'F2', farmerName: 'Sunita Devi',  chamberId: 'C1' },
    { id: 'L03', produce: 'potato', quantityKg: 2500, arrivalDate: d(10), farmerId: 'F3', farmerName: 'Venkat Reddy', chamberId: 'C1' },
    // Chamber 2 – Apple
    { id: 'L04', produce: 'apple',  quantityKg: 2000, arrivalDate: d(45), farmerId: 'F1', farmerName: 'Raju Naidu',   chamberId: 'C2' },
    { id: 'L05', produce: 'apple',  quantityKg: 1500, arrivalDate: d(20), farmerId: 'F4', farmerName: 'Priya Kumari', chamberId: 'C2' },
    { id: 'L06', produce: 'apple',  quantityKg: 1000, arrivalDate: d(5),  farmerId: 'F2', farmerName: 'Sunita Devi',  chamberId: 'C2' },
    // Chamber 3 – Mixed
    { id: 'L07', produce: 'onion',  quantityKg: 8000, arrivalDate: d(55), farmerId: 'F3', farmerName: 'Venkat Reddy', chamberId: 'C3' },
    { id: 'L08', produce: 'onion',  quantityKg: 4000, arrivalDate: d(25), farmerId: 'F4', farmerName: 'Priya Kumari', chamberId: 'C3' },
    { id: 'L09', produce: 'potato', quantityKg: 1500, arrivalDate: d(15), farmerId: 'F1', farmerName: 'Raju Naidu',   chamberId: 'C3' },
    // Chamber 4 – Chilli
    { id: 'L10', produce: 'chilli', quantityKg: 500,  arrivalDate: d(18), farmerId: 'F2', farmerName: 'Sunita Devi',  chamberId: 'C4' },
    { id: 'L11', produce: 'chilli', quantityKg: 800,  arrivalDate: d(8),  farmerId: 'F3', farmerName: 'Venkat Reddy', chamberId: 'C4' },
    { id: 'L12', produce: 'chilli', quantityKg: 300,  arrivalDate: d(2),  farmerId: 'F4', farmerName: 'Priya Kumari', chamberId: 'C4' },
  ];
}

// ── Reading generator ─────────────────────────────────────────
function generateReadings(
  chambers: Chamber[],
  days: number,
  baseDate: Date
): Reading[] {
  const readings: Reading[] = [];
  let idCounter = 1;

  for (let day = days - 1; day >= 0; day--) {
    for (let hour = 0; hour < 24; hour++) {
      const ts = new Date(baseDate);
      ts.setDate(ts.getDate() - day);
      ts.setHours(hour, 0, 0, 0);

      for (const chamber of chambers) {
        // Base temperature oscillates slightly around target
        const diurnal = 0.3 * Math.sin((hour - 14) * Math.PI / 12); // afternoon warmer
        let baseTemp  = chamber.targetTempC + diurnal;
        let baseHum   = chamber.id === 'C4' ? 88 : chamber.id === 'C3' ? 72 : 90;
        let compRun   = clamp(randn(0.55, 0.1), 0.3, 0.85); // hours per hour
        let doorCount = Math.random() < 0.15 ? 1 : 0; // 15% chance of door open

        // ── Inject blocked coil fault in C2 from day 30 ──
        const dayNumber = days - 1 - day; // 0-indexed from start
        if (chamber.id === 'C2' && dayNumber >= 30) {
          const severity = Math.min(1, (dayNumber - 30) / 20); // ramps up over 20 days
          baseTemp  += severity * 2.5 + randn(0, 0.2);         // temp rises
          compRun    = clamp(compRun + severity * 0.25, 0, 1);  // compressor works harder
        }

        // ── Inject door-left-open in C3 on day 45 ──────────
        if (chamber.id === 'C3' && dayNumber === 45 && hour >= 9 && hour <= 11) {
          doorCount  = 5; // multiple door opens
          baseTemp  += 2.0 + randn(0, 0.3);
          compRun    = clamp(compRun + 0.3, 0, 1);
        }

        const tempC    = clamp(randn(baseTemp, 0.15), -5, 40);
        const humidity = clamp(randn(baseHum, 2), 50, 99);

        readings.push({
          id: `R${String(idCounter++).padStart(5, '0')}`,
          chamberId: chamber.id,
          timestamp: ts.toISOString(),
          tempC: parseFloat(tempC.toFixed(2)),
          humidity: parseFloat(humidity.toFixed(1)),
          compressorRunHours: parseFloat(compRun.toFixed(2)),
          doorOpenCount: doorCount,
          intervalHours: 1,
        });
      }
    }
  }

  return readings;
}

// ── Public API ────────────────────────────────────────────────
export interface DemoDataset {
  chambers: Chamber[];
  readings: Reading[];
  lots: Lot[];
  farmers: Farmer[];
  produceMeta: ProduceMeta[];
}

/**
 * generateDemoData
 * Generates a complete 60-day synthetic dataset.
 * Call this when the user clicks "Load Demo Data".
 */
export function generateDemoData(): DemoDataset {
  const baseDate = new Date();
  baseDate.setHours(6, 0, 0, 0); // start at 6 AM today

  return {
    chambers: DEMO_CHAMBERS,
    readings: generateReadings(DEMO_CHAMBERS, 60, baseDate),
    lots: makeLots(baseDate),
    farmers: DEMO_FARMERS,
    produceMeta: DEFAULT_PRODUCE_META,
  };
}
