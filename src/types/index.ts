// ============================================================
// ColdTwin – Central Type Definitions
// ============================================================

export type Role = 'owner' | 'farmer' | 'staff';
export type Language = 'en' | 'te' | 'hi';
export type UrgencyLevel = 'red' | 'amber' | 'green';
export type ChamberStatus = 'normal' | 'warning' | 'fault' | 'unknown';
export type FaultType = 'blocked_coil' | 'door_left_open' | 'short_cycling';

// ── Produce ──────────────────────────────────────────────────
export type ProduceType = 'potato' | 'apple' | 'onion' | 'chilli' | string;

export interface ProduceMeta {
  produce: ProduceType;
  idealTempC: number;       // °C
  idealHumidity: number;    // %RH
  baseShelfLifeDays: number;
  q10Factor: number;        // rate multiplier per 10°C above ideal
  notes: string;
  minSafeTempC?: number;    // optional safe minimum temperature (°C); temperatures below cause chilling injury
}

// ── Chamber ──────────────────────────────────────────────────
export interface Chamber {
  id: string;               // 'C1' .. 'C4'
  name: string;
  targetTempC: number;
  ambientTempC: number;
  compressorKW: number;     // rated compressor power, kW
}

// ── Reading (one time-step per chamber) ──────────────────────
export interface Reading {
  id: string;
  chamberId: string;
  timestamp: string;        // ISO 8601
  tempC: number;
  humidity: number;
  compressorRunHours: number;   // hours compressor ran in this interval
  doorOpenCount: number;
  intervalHours: number;        // duration of interval (default 1)
}

// ── Lot ──────────────────────────────────────────────────────
export interface Lot {
  id: string;
  produce: ProduceType;
  quantityKg: number;
  arrivalDate: string;          // ISO date
  farmerId: string;
  farmerName: string;
  chamberId: string;
  notes?: string;
}

// ── Engine Outputs ───────────────────────────────────────────
export interface ThermalPrediction {
  chamberId: string;
  timestamp: string;
  expectedTempC: number;
  residual: number;             // actual - expected
}

export interface FaultAlert {
  chamberId: string;
  riskScore: number;            // 0–100
  level: UrgencyLevel;
  reason: string;
  suggestedAction: string;
  topFactors: string[];
  timestamp: string;
}

export interface ShelfLifeEstimate {
  lotId: string;
  remainingDays: number;        // central estimate
  lowDays: number;              // pessimistic
  highDays: number;             // optimistic
  urgency: UrgencyLevel;
  explanation: string;
  dailyConsumptionRate: number; // fraction of life consumed per day
}

export interface RankedLot extends ShelfLifeEstimate {
  lot: Lot;
  rank: number;
}

export interface EnergyWasteEstimate {
  chamberId: string;
  extraKwh: number;
  extraCostINR: number;
  reason: string;
}

// ── Settings ─────────────────────────────────────────────────
export interface AlertThresholds {
  riskScoreAlert: number;       // default 60
  tempDeviationAlert: number;   // °C default 2
  shelfLifeRedDays: number;     // default 3
  shelfLifeAmberDays: number;   // default 7
}

export interface AppSettings {
  storeName: string;
  tariffINRperKwh: number;
  alertThresholds: AlertThresholds;
  language: Language;
}

// ── Fault Simulation ─────────────────────────────────────────
export interface FaultInjection {
  id: string;
  chamberId: string;
  faultType: FaultType;
  injectedAt: string;           // ISO timestamp
  durationHours: number;
}

// ── Farmer ───────────────────────────────────────────────────
export interface Farmer {
  id: string;
  name: string;
  phone?: string;
}
