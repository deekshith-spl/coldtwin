import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';

describe('Store Simulation Restoration', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().loadDemoData();
  });

  it('restores the exact pre-simulation readings without regenerating random data', () => {
    const store = useStore.getState();
    const chamberId = 'C1';

    // Get snapshot of readings before simulation
    const originalReadings = [...store.readings];
    const originalC1Readings = originalReadings.filter(r => r.chamberId === chamberId);
    const otherChamberReadings = originalReadings.filter(r => r.chamberId !== chamberId);

    // Simulate fault in C1
    store.simulateFault(chamberId, 'blocked_coil');

    const simulatedState = useStore.getState();
    expect(simulatedState.activeSimulation).not.toBeNull();
    expect(simulatedState.activeSimulation?.chamberId).toBe(chamberId);
    expect(simulatedState.activeSimulation?.faultType).toBe('blocked_coil');

    // Only the modified chamber readings are stored in preSimulationReadings
    expect(simulatedState.preSimulationReadings).toBeDefined();
    expect(simulatedState.preSimulationReadings?.length).toBeLessThanOrEqual(48);
    expect(simulatedState.preSimulationReadings?.length).toBeLessThan(originalReadings.length);
    expect(simulatedState.preSimulationReadings?.every(r => r.chamberId === chamberId)).toBe(true);

    // Other chamber readings should be identical
    const currentOther = simulatedState.readings.filter(r => r.chamberId !== chamberId);
    expect(currentOther).toEqual(otherChamberReadings);

    // Chamber 1 readings must be different from original
    const currentC1 = simulatedState.readings.filter(r => r.chamberId === chamberId);
    expect(currentC1).not.toEqual(originalC1Readings);

    // Clear simulation
    simulatedState.clearSimulation();

    const restoredState = useStore.getState();
    expect(restoredState.activeSimulation).toBeNull();
    expect(restoredState.preSimulationReadings).toBeNull();

    // Verify all readings are restored exactly to original values
    expect(restoredState.readings.length).toBe(originalReadings.length);
    expect(restoredState.readings).toEqual(originalReadings);
  });
});
