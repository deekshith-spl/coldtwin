import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { X, Zap, Wind, RotateCcw, Play } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';
import { computeThermalPredictions } from '@/engine/thermalTwin';
import { computeFaultAlert } from '@/engine/faultDetection';
import { RiskGauge } from '@/components/ui/RiskGauge';
import type { Chamber, FaultType } from '@/types';

// ── Floor Plan ───────────────────────────────────────────────
function FloorPlan({
  chambers,
  alerts,
  selected,
  onSelect,
}: {
  chambers: Chamber[];
  alerts: Record<string, number>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const cellW = 140, cellH = 80, gap = 12, pad = 20;
  const totalW = pad * 2 + 2 * cellW + gap;
  const totalH = pad * 2 + 2 * cellH + gap;

  const positions = [
    { x: pad,              y: pad },
    { x: pad + cellW + gap, y: pad },
    { x: pad,              y: pad + cellH + gap },
    { x: pad + cellW + gap, y: pad + cellH + gap },
  ];

  const riskColor = (score: number) =>
    score >= 60 ? '#fca5a5' : score >= 30 ? '#fcd34d' : '#86efac';

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full max-w-xs mx-auto">
      {/* Store outline */}
      <rect x={pad/2} y={pad/2} width={totalW - pad} height={totalH - pad}
        rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
      <text x={totalW/2} y={pad/2 - 4} textAnchor="middle" fontSize="10" fill="#94a3b8">
        Cold Store Floor Plan
      </text>

      {chambers.slice(0, 4).map((c, i) => {
        const { x, y } = positions[i];
        const score = alerts[c.id] ?? 0;
        const fill  = riskColor(score);
        const isSelected = selected === c.id;

        return (
          <g key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: 'pointer' }}>
            <rect
              x={x} y={y} width={cellW} height={cellH} rx="6"
              fill={fill} stroke={isSelected ? '#1d4ed8' : '#94a3b8'}
              strokeWidth={isSelected ? 2.5 : 1}
            />
            <text x={x + cellW/2} y={y + cellH/2 - 10} textAnchor="middle"
              fontSize="11" fontWeight="600" fill="#1e293b">
              {c.id}
            </text>
            <text x={x + cellW/2} y={y + cellH/2 + 4} textAnchor="middle"
              fontSize="9" fill="#475569">
              {c.name.split('–')[1]?.trim() ?? c.name}
            </text>
            <text x={x + cellW/2} y={y + cellH/2 + 18} textAnchor="middle"
              fontSize="9" fill={score >= 60 ? '#dc2626' : '#16a34a'}>
              Risk: {score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Twin Chart ────────────────────────────────────────────────
function TwinChart({ chamberId }: { chamberId: string }) {
  const { chambers, readings } = useStore();
  const chamber = chambers.find(c => c.id === chamberId);

  const chartData = useMemo(() => {
    if (!chamber) return [];
    const chamberReadings = readings
      .filter(r => r.chamberId === chamberId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-72); // last 72 hrs
    const predictions = computeThermalPredictions(chamber, chamberReadings);
    return chamberReadings.map((r, i) => ({
      ts:       new Date(r.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit' }),
      actual:   parseFloat(r.tempC.toFixed(2)),
      expected: predictions[i]?.expectedTempC ?? null,
      upper:    predictions[i] ? predictions[i].expectedTempC + 1.5 : null,
      lower:    predictions[i] ? predictions[i].expectedTempC - 1.5 : null,
    }));
  }, [chamberId, readings, chambers]);

  if (chartData.length === 0) return <div className="text-sm text-gray-400 py-8 text-center">No data for this chamber.</div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 30, left: 0 }}>
        <defs>
          <linearGradient id="devBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#fbbf24" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis dataKey="ts" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} unit="°C" />
        <Tooltip formatter={(v: number) => `${v?.toFixed ? v.toFixed(2) : v}°C`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="upper" stroke="none" fill="url(#devBand)" name="Expected ±1.5°C" legendType="none" />
        <Area type="monotone" dataKey="lower" stroke="none" fill="white" fillOpacity={1} name=" " legendType="none" />
        <Line type="monotone" dataKey="expected" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="Twin (expected)" />
        <Line type="monotone" dataKey="actual"   stroke="#3b82f6" strokeWidth={2} dot={false} name="Actual" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Fault Simulator ───────────────────────────────────────────
function FaultSimulator({ chamberId }: { chamberId: string }) {
  const T = useT();
  const { simulateFault, clearSimulation, activeSimulation } = useStore();
  const [simulating, setSimulating] = useState(false);

  const faultOptions: { type: FaultType; label: string; icon: JSX.Element; description: string }[] = [
    { type: 'blocked_coil',  label: T.fault_blocked_coil,  icon: <Wind size={16} />,      description: 'Gradual temperature rise; compressor works overtime' },
    { type: 'door_left_open', label: T.fault_door_open,    icon: <Zap size={16} />,       description: 'Sudden heat spike, slow recovery' },
    { type: 'short_cycling',  label: T.fault_short_cycling, icon: <RotateCcw size={16} />, description: 'Rapid compressor on/off, oscillating temperature' },
  ];

  const handleSimulate = (type: FaultType) => {
    setSimulating(true);
    simulateFault(chamberId, type);
    setTimeout(() => setSimulating(false), 600);
  };

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Play size={16} className="text-amber-700" />
        <h3 className="font-semibold text-amber-900 text-sm">{T.simulate_fault} — {chamberId}</h3>
      </div>
      <p className="text-xs text-amber-700 mb-3">
        Inject a fault pattern into this chamber's readings. The dashboard will react in real time.
      </p>

      {activeSimulation && activeSimulation.chamberId === chamberId && (
        <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          <span>⚠️ Simulation active: <strong>{activeSimulation.faultType}</strong></span>
          <button onClick={clearSimulation} className="underline ml-2">Clear</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {faultOptions.map(opt => (
          <button
            key={opt.type}
            onClick={() => handleSimulate(opt.type)}
            disabled={simulating}
            className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
              simulating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:shadow-sm cursor-pointer'
            } bg-white border-amber-200`}
          >
            <span className="text-amber-700">{opt.icon}</span>
            <div>
              <div className="font-medium text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Digital Twin Page ────────────────────────────────────
export default function DigitalTwin() {
  const T = useT();
  const [searchParams] = useSearchParams();
  const { chambers, readings } = useStore();
  const [selectedChamber, setSelectedChamber] = useState<string | null>(
    searchParams.get('chamber')
  );

  useEffect(() => {
    const c = searchParams.get('chamber');
    if (c) setSelectedChamber(c);
  }, [searchParams]);

  const alertScores = useMemo(() => {
    const scores: Record<string, number> = {};
    chambers.forEach(chamber => {
      const cr = readings.filter(r => r.chamberId === chamber.id);
      const preds = computeThermalPredictions(chamber, cr);
      scores[chamber.id] = computeFaultAlert(chamber, cr, preds).riskScore;
    });
    return scores;
  }, [chambers, readings]);

  const selectedChamberObj = chambers.find(c => c.id === selectedChamber);
  const selectedAlert = selectedChamber
    ? (() => {
        const cr = readings.filter(r => r.chamberId === selectedChamber);
        const preds = computeThermalPredictions(selectedChamberObj!, cr);
        return computeFaultAlert(selectedChamberObj!, cr, preds);
      })()
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{T.nav_digital_twin}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Click a chamber to see the twin's prediction vs actual temperature.
          Use "Simulate a Fault" to see alerts in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Floor plan */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Floor Plan</h2>
          <FloorPlan
            chambers={chambers}
            alerts={alertScores}
            selected={selectedChamber}
            onSelect={setSelectedChamber}
          />
          <div className="mt-4 flex flex-col gap-1 text-xs text-gray-500">
            <div className="flex items-center gap-2"><span className="w-4 h-3 rounded bg-red-300 inline-block" /> High risk (≥60)</div>
            <div className="flex items-center gap-2"><span className="w-4 h-3 rounded bg-yellow-300 inline-block" /> Medium (30–59)</div>
            <div className="flex items-center gap-2"><span className="w-4 h-3 rounded bg-green-300 inline-block" /> Normal (&lt;30)</div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedChamber && selectedChamberObj ? (
            <div className="card flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selectedChamberObj.name}</h2>
                  <p className="text-xs text-gray-400">Target: {selectedChamberObj.targetTempC}°C · Ambient: {selectedChamberObj.ambientTempC}°C</p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedAlert && <RiskGauge score={selectedAlert.riskScore} />}
                  <button onClick={() => setSelectedChamber(null)} className="p-1 rounded hover:bg-gray-100">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {selectedAlert && (
                <div className={`text-xs rounded-lg px-3 py-2 ${
                  selectedAlert.level === 'red' ? 'bg-red-50 text-red-700 border border-red-200' :
                  selectedAlert.level === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <strong>Reason:</strong> {selectedAlert.reason}
                  <br /><strong>Action:</strong> {selectedAlert.suggestedAction}
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Actual vs Twin Expected Temperature (last 72 readings)
                </div>
                <TwinChart chamberId={selectedChamber} />
                <div className="text-xs text-gray-400 mt-1">
                  Shaded band = ±1.5°C tolerance. Readings outside this band contribute to fault risk score.
                  <br /><em>These are estimates from a simplified model. Always validate with real data.</em>
                </div>
              </div>

              <FaultSimulator chamberId={selectedChamber} />
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <div className="text-4xl">🏭</div>
              <p className="text-sm">Click a chamber on the floor plan to see its twin analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
