import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { Thermometer, Droplets, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Chamber, Reading, FaultAlert, ChamberStatus } from '@/types';

interface ChamberTileProps {
  chamber: Chamber;
  recentReadings: Reading[];
  alert?: FaultAlert;
  onClick?: () => void;
}

function getChamberStatus(alert?: FaultAlert): ChamberStatus {
  if (!alert) return 'unknown';
  if (alert.riskScore >= 60) return 'fault';
  if (alert.riskScore >= 30) return 'warning';
  return 'normal';
}

const STATUS_STYLES: Record<ChamberStatus, { border: string; badge: string; icon: JSX.Element }> = {
  normal:  { border: 'border-green-200',  badge: 'bg-green-100 text-green-700', icon: <CheckCircle size={13} className="text-green-600" /> },
  warning: { border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700', icon: <AlertCircle size={13} className="text-amber-500" /> },
  fault:   { border: 'border-red-300',    badge: 'bg-red-100 text-red-700',     icon: <AlertTriangle size={13} className="text-red-500" /> },
  unknown: { border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-500',   icon: <CheckCircle size={13} className="text-gray-400" /> },
};

export function ChamberTile({ chamber, recentReadings, alert, onClick }: ChamberTileProps) {
  const status = getChamberStatus(alert);
  const styles = STATUS_STYLES[status];
  const last = recentReadings[recentReadings.length - 1];

  // Sparkline data: last 24 readings
  const sparkData = recentReadings.slice(-24).map((r, i) => ({ i, v: r.tempC }));

  return (
    <button
      onClick={onClick}
      className={`card flex flex-col gap-3 text-left hover:shadow-md transition-all cursor-pointer border ${styles.border}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800 leading-tight">{chamber.name}</div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${styles.badge}`}>
          {styles.icon}
          <span className="capitalize">{status}</span>
        </div>
      </div>

      {/* Temperature & Humidity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Thermometer size={16} className="text-cold-500" />
          <span className="text-xl font-bold text-gray-900">
            {last ? `${last.tempC.toFixed(1)}°C` : '—'}
          </span>
          <span className="text-xs text-gray-400">(target {chamber.targetTempC}°C)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets size={14} className="text-blue-400" />
          <span className="text-sm text-gray-600">{last ? `${last.humidity.toFixed(0)}%` : '—'}</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-10">
        {sparkData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone" dataKey="v"
                stroke={status === 'fault' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#3b82f6'}
                strokeWidth={1.5} dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-gray-300 flex items-center h-full">No data</div>
        )}
      </div>

      {/* Risk score */}
      {alert && (
        <div className="text-xs text-gray-500">
          Risk score: <span className={`font-semibold ${alert.riskScore >= 60 ? 'text-red-600' : alert.riskScore >= 30 ? 'text-amber-600' : 'text-green-600'}`}>
            {alert.riskScore}
          </span>/100
        </div>
      )}
    </button>
  );
}
