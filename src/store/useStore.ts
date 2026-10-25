import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Role, Chamber, Reading, Lot, ProduceMeta, AppSettings,
  FaultInjection, Farmer, FaultType,
} from '@/types';
import { generateDemoData, DEFAULT_PRODUCE_META, DEMO_CHAMBERS } from '@/engine/demoData';
import { injectFaultPattern } from '@/engine/faultDetection';

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Sri Venkateswara Cold Store, Kurnool',
  tariffINRperKwh: 8,
  alertThresholds: {
    riskScoreAlert: 60,
    tempDeviationAlert: 2,
    shelfLifeRedDays: 3,
    shelfLifeAmberDays: 7,
  },
  language: 'en',
};

export interface StoreState {
  // Role & view
  role: Role;
  currentFarmerId: string | null;

  // Data
  isDemoData: boolean;
  chambers: Chamber[];
  readings: Reading[];
  lots: Lot[];
  farmers: Farmer[];
  produceMeta: ProduceMeta[];
  settings: AppSettings;
  simulatedFaults: FaultInjection[];

  // Active fault simulation (affects displayed readings)
  activeSimulation: FaultInjection | null;

  // Actions
  setRole: (role: Role) => void;
  setCurrentFarmer: (id: string | null) => void;
  loadDemoData: () => void;
  clearData: () => void;
  addReadings: (readings: Reading[]) => void;
  addLot: (lot: Lot) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateProduceMeta: (meta: ProduceMeta[]) => void;
  simulateFault: (chamberId: string, faultType: FaultType) => void;
  clearSimulation: () => void;
}

const initialDemo = generateDemoData();

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      role: 'owner',
      currentFarmerId: initialDemo.farmers[0]?.id ?? null,
      isDemoData: true,
      chambers: initialDemo.chambers,
      readings: initialDemo.readings,
      lots: initialDemo.lots,
      farmers: initialDemo.farmers,
      produceMeta: initialDemo.produceMeta,
      settings: DEFAULT_SETTINGS,
      simulatedFaults: [],
      activeSimulation: null,

      setRole: (role) => set({ role }),
      setCurrentFarmer: (id) => set({ currentFarmerId: id }),

      loadDemoData: () => {
        const demo = generateDemoData();
        set({
          isDemoData: true,
          chambers: demo.chambers,
          readings: demo.readings,
          lots: demo.lots,
          farmers: demo.farmers,
          produceMeta: demo.produceMeta,
          activeSimulation: null,
        });
      },

      clearData: () => {
        set({
          isDemoData: false,
          readings: [],
          lots: [],
          farmers: [],
          activeSimulation: null,
          simulatedFaults: [],
        });
      },

      addReadings: (newReadings) => {
        set(state => ({ readings: [...state.readings, ...newReadings] }));
      },

      addLot: (lot) => {
        set(state => ({ lots: [...state.lots, lot] }));
      },

      updateSettings: (patch) => {
        set(state => ({ settings: { ...state.settings, ...patch } }));
      },

      updateProduceMeta: (meta) => {
        set({ produceMeta: meta });
      },

      simulateFault: (chamberId, faultType) => {
        const state = get();
        const chamberReadings = state.readings
          .filter(r => r.chamberId === chamberId)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Inject fault into the last 48 readings of this chamber
        const startIdx = Math.max(0, chamberReadings.length - 48);
        const patched = injectFaultPattern(chamberReadings, faultType, startIdx);

        // Replace the affected readings in the global list
        const patchedIds = new Set(patched.map(r => r.id));
        const otherReadings = state.readings.filter(r =>
          r.chamberId !== chamberId || !patchedIds.has(r.id)
        );

        const injection: FaultInjection = {
          id: `SIM_${Date.now()}`,
          chamberId,
          faultType,
          injectedAt: new Date().toISOString(),
          durationHours: 24,
        };

        set({
          readings: [...otherReadings, ...patched],
          activeSimulation: injection,
          simulatedFaults: [...state.simulatedFaults, injection],
        });
      },

      clearSimulation: () => {
        // Reload demo data to clear injected faults
        const demo = generateDemoData();
        set(state => ({
          readings: state.isDemoData ? demo.readings : state.readings,
          activeSimulation: null,
        }));
      },
    }),
    {
      name: 'coldtwin_v1',
      // Only persist data, not transient state
      partialize: (state) => ({
        role: state.role,
        currentFarmerId: state.currentFarmerId,
        isDemoData: state.isDemoData,
        chambers: state.chambers,
        readings: state.readings,
        lots: state.lots,
        farmers: state.farmers,
        produceMeta: state.produceMeta,
        settings: state.settings,
      }),
    }
  )
);
