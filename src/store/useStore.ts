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

export type Theme = 'light' | 'dark';

export interface StoreState {
  // Role & view
  role: Role;
  currentFarmerId: string | null;

  // Theme
  theme: Theme;

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
  preSimulationReadings: Reading[] | null;

  // Walkthrough tour state
  isTourOpen: boolean;

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
  openTour: () => void;
  closeTour: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const initialDemo = generateDemoData();

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('coldtwin_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  try {
    localStorage.setItem('coldtwin_theme', theme);
  } catch {
    // ignore
  }
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      role: 'owner',
      currentFarmerId: initialDemo.farmers[0]?.id ?? null,
      theme: initialTheme,
      isDemoData: true,
      chambers: initialDemo.chambers,
      readings: initialDemo.readings,
      lots: initialDemo.lots,
      farmers: initialDemo.farmers,
      produceMeta: initialDemo.produceMeta,
      settings: DEFAULT_SETTINGS,
      simulatedFaults: [],
      activeSimulation: null,
      preSimulationReadings: null,
      isTourOpen: false,

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
          preSimulationReadings: null,
        });
      },

      clearData: () => {
        set({
          isDemoData: false,
          readings: [],
          lots: [],
          farmers: [],
          activeSimulation: null,
          preSimulationReadings: null,
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
        // Preserve exact snapshot before any simulation is injected
        const originalReadings = state.preSimulationReadings ?? [...state.readings];

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
          preSimulationReadings: originalReadings,
          simulatedFaults: [...state.simulatedFaults, injection],
        });
      },

      clearSimulation: () => {
        const state = get();
        // Restore the exact same data that existed prior to simulation without regenerating random data
        if (state.preSimulationReadings) {
          set({
            readings: state.preSimulationReadings,
            preSimulationReadings: null,
            activeSimulation: null,
          });
        } else {
          set({
            activeSimulation: null,
          });
        }
      },

      openTour: () => set({ isTourOpen: true }),

      closeTour: () => {
        try {
          localStorage.setItem('coldtwin_walkthrough_seen', 'true');
        } catch {
          // ignore localStorage access errors
        }
        set({ isTourOpen: false });
      },

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
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
