import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { X, Zap, Wind, RotateCcw, Play, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
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
  const { theme } = useStore();
  const isDark = theme === 'dark';
  const cellW = 140, cellH = 80, gap = 12, pad = 20;
  const totalW = pad * 2 + 2 * cellW + gap;
  const totalH = pad * 2 + 2 * cellH + gap;

  const positions = [
    { x: pad,              y: pad },
    { x: pad + cellW + gap, y: pad },
    { x: pad,              y: pad + cellH + gap },
    { x: pad + cellW + gap, y: pad + cellH + gap },
  ];

  const riskColor = (score: number) => {
    if (isDark) {
      return score >= 60 ? '#7f1d1d' : score >= 30 ? '#78350f' : '#14532d';
    }
    return score >= 60 ? '#fca5a5' : score >= 30 ? '#fcd34d' : '#86efac';
  };

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full max-w-xs mx-auto">
      {/* Store outline */}
      <rect x={pad/2} y={pad/2} width={totalW - pad} height={totalH - pad}
        rx="8" fill={isDark ? '#0f172a' : '#f8fafc'} stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth="2" />
      <text x={totalW/2} y={pad/2 - 4} textAnchor="middle" fontSize="10" fill={isDark ? '#64748b' : '#94a3b8'}>
        Cold Store Floor Plan
      </text>

      {chambers.slice(0, 4).map((c, i) => {
        const { x, y } = positions[i];
        const score = alerts[c.id] ?? 0;
        const fill  = riskColor(score);
        const isSelected = selected === c.id;

        return (
          <g
            key={c.id}
            role="button"
            tabIndex={0}
            aria-label={`Chamber ${c.id}, ${c.name}, Risk score ${score} out of 100`}
            onClick={() => onSelect(c.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(c.id);
              }
            }}
            className="focus:outline-none focus:ring-2 focus:ring-cold-600 cursor-pointer"
          >
            <rect
              x={x} y={y} width={cellW} height={cellH} rx="6"
              fill={fill} stroke={isSelected ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#475569' : '#94a3b8')}
              strokeWidth={isSelected ? 2.5 : 1}
            />
            <text x={x + cellW/2} y={y + cellH/2 - 10} textAnchor="middle"
              fontSize="11" fontWeight="600" fill={isDark ? '#f8fafc' : '#1e293b'}>
              {c.id}
            </text>
            <text x={x + cellW/2} y={y + cellH/2 + 4} textAnchor="middle"
              fontSize="9" fill={isDark ? '#cbd5e1' : '#475569'}>
              {c.name.split('–')[1]?.trim() ?? c.name}
            </text>
            <text x={x + cellW/2} y={y + cellH/2 + 18} textAnchor="middle"
              fontSize="9" fontWeight="600" fill={
                isDark
                  ? (score >= 60 ? '#fca5a5' : score >= 30 ? '#fde047' : '#86efac')
                  : (score >= 60 ? '#dc2626' : score >= 30 ? '#b45309' : '#16a34a')
              }>
              Risk: {score} ({score >= 60 ? 'High' : score >= 30 ? 'Med' : 'Low'})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Twin Chart ────────────────────────────────────────────────
function TwinChart({ chamberId }: { chamberId: string }) {
  const { chambers, readings, theme } = useStore();
  const chamber = chambers.find(c => c.id === chamberId);
  const isDark = theme === 'dark';

  const chartData = useMemo(() => {
    if (!chamber) return [];
    const chamberReadings = readings
      .filter(r => r.chamberId === chamberId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-72); // last 72 hrs
    const predictions = computeThermalPredictions(chamber, chamberReadings);
    return chamberReadings.map((r, i) => {
      const exp = predictions[i]?.expectedTempC ?? null;
      const d = new Date(r.timestamp);
      const month = d.toLocaleString('en-US', { month: 'short' });
      const day = d.getDate();
      const hour = `${d.getHours().toString().padStart(2, '0')}:00`;

      return {
        ts: `${day} ${month} ${hour}`,
        actual: parseFloat(r.tempC.toFixed(2)),
        expected: exp !== null ? parseFloat(exp.toFixed(2)) : null,
        base: exp !== null ? parseFloat((exp - 1.5).toFixed(2)) : null,
        band: exp !== null ? 3.0 : null,
      };
    });
  }, [chamberId, readings, chamber]);

  if (chartData.length === 0) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No data for this chamber.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="devBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={isDark ? '#fbbf24' : '#f59e0b'} stopOpacity={isDark ? 0.35 : 0.25} />
            <stop offset="95%" stopColor={isDark ? '#fbbf24' : '#f59e0b'} stopOpacity={isDark ? 0.20 : 0.10} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? '#334155' : '#f1f5f9'}
          vertical={false}
        />
        <XAxis
          dataKey="ts"
          height={60}
          angle={-35}
          textAnchor="end"
          minTickGap={40}
          tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
          axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
          tickLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
        />
        <YAxis
          domain={['dataMin - 1', 'dataMax + 1']}
          unit="°C"
          tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
          axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
          tickLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            color: isDark ? '#f8fafc' : '#0f172a',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            fontSize: '12px',
          }}
          itemStyle={{
            color: isDark ? '#f8fafc' : '#0f172a',
          }}
          formatter={(v: any, name: string) => {
            if (name === 'base' || name === 'band' || name === 'Expected ±1.5°C') return null;
            return [`${Number(v)?.toFixed ? Number(v).toFixed(2) : v}°C`, name];
          }}
        />
        <Legend
          verticalAlign="top"
          height={28}
          wrapperStyle={{
            fontSize: 11,
            color: isDark ? '#cbd5e1' : '#475569',
            paddingBottom: '4px',
          }}
        />
        {/* Invisible base area to float the tolerance band (expected - 1.5) */}
        <Area
          type="monotone"
          dataKey="base"
          stackId="tolerance"
          stroke="none"
          fill="none"
          legendType="none"
          tooltipType="none"
          isAnimationActive={false}
        />
        {/* Visible tolerance band area (width 3.0) */}
        <Area
          type="monotone"
          dataKey="band"
          stackId="tolerance"
          stroke="none"
          fill="url(#devBand)"
          name="Expected ±1.5°C"
          tooltipType="none"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="expected"
          stroke={isDark ? '#fbbf24' : '#f59e0b'}
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="5 3"
          name="Twin (expected)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={isDark ? '#60a5fa' : '#2563eb'}
          strokeWidth={2}
          dot={false}
          name="Actual"
          isAnimationActive={false}
        />
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
    <div className="border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Play size={16} className="text-amber-700 dark:text-amber-400" />
        <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">{T.simulate_fault} — {chamberId}</h3>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
        Inject a fault pattern into this chamber's readings. The dashboard will react in real time.
      </p>

      {activeSimulation && activeSimulation.chamberId === chamberId && (
        <div className="mb-3 flex items-center justify-between bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-300">
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
              simulating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm cursor-pointer'
            } bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-900/40`}
          >
            <span className="text-amber-700 dark:text-amber-400">{opt.icon}</span>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{opt.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</div>
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
  const { chambers, readings, settings } = useStore();
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
      scores[chamber.id] = computeFaultAlert(chamber, cr, preds, settings.alertThresholds).riskScore;
    });
    return scores;
  }, [chambers, readings, settings.alertThresholds]);

  const selectedChamberObj = chambers.find(c => c.id === selectedChamber);
  const selectedAlert = selectedChamber
    ? (() => {
        const cr = readings.filter(r => r.chamberId === selectedChamber);
        const preds = computeThermalPredictions(selectedChamberObj!, cr);
        return computeFaultAlert(selectedChamberObj!, cr, preds, settings.alertThresholds);
      })()
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{T.nav_digital_twin}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click a chamber to see the twin's prediction vs actual temperature.
          Use "Simulate a Fault" to see alerts in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Floor plan */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Floor Plan</h2>
          <FloorPlan
            chambers={chambers}
            alerts={alertScores}
            selected={selectedChamber}
            onSelect={setSelectedChamber}
          />
          <div className="mt-4 flex flex-col gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0" aria-hidden="true" />
              <span>High risk (≥60)</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0" aria-hidden="true" />
              <span>Medium risk (30–59)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500 shrink-0" aria-hidden="true" />
              <span>Normal risk (&lt;30)</span>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedChamber && selectedChamberObj ? (
            <div className="card flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{selectedChamberObj.name}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Target: {selectedChamberObj.targetTempC}°C · Ambient: {selectedChamberObj.ambientTempC}°C</p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedAlert && <RiskGauge score={selectedAlert.riskScore} />}
                  <button
                    type="button"
                    onClick={() => setSelectedChamber(null)}
                    aria-label="Close chamber details"
                    className="min-w-[44px] min-h-[44px] p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {selectedAlert && (
                <div className={`text-xs rounded-lg p-3 flex items-start gap-2.5 ${
                  selectedAlert.level === 'red' ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900' :
                  selectedAlert.level === 'amber' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900' :
                  'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-900'
                }`}>
                  {selectedAlert.level === 'red' ? (
                    <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : selectedAlert.level === 'amber' ? (
                    <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold uppercase tracking-wider text-[10px] mb-0.5">
                      {selectedAlert.level === 'red' ? 'Critical Equipment Risk' :
                       selectedAlert.level === 'amber' ? 'Elevated Equipment Risk' :
                       'Nominal Equipment Status'}
                    </div>
                    <div><strong>Reason:</strong> {selectedAlert.reason}</div>
                    <div className="mt-0.5"><strong>Action:</strong> {selectedAlert.suggestedAction}</div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Actual vs Twin Expected Temperature (last 72 readings)
                </div>
                <TwinChart chamberId={selectedChamber} />
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Shaded band = ±1.5°C tolerance. Readings outside this band contribute to fault risk score.
                  <br /><em>These are estimates from a simplified model. Always validate with real data.</em>
                </div>
              </div>

              <FaultSimulator chamberId={selectedChamber} />
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 gap-3 text-gray-400 dark:text-gray-500">
              <div className="text-4xl">🏭</div>
              <p className="text-sm">Click a chamber on the floor plan to see its twin analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
