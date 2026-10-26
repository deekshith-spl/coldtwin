import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { Thermometer, Droplets, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useT } from '@/i18n';
import type { Chamber, Reading, FaultAlert, ChamberStatus } from '@/types';

interface ChamberTileProps {
  chamber: Chamber;
  recentReadings: Reading[];
  alert?: FaultAlert;
  onClick?: () => void;
}

function getChamberStatus(alert?: FaultAlert): ChamberStatus {
  if (!alert) return 'unknown';
  if (alert.level === 'red') return 'fault';
  if (alert.level === 'amber') return 'warning';
  return 'normal';
}

const STATUS_STYLES: Record<ChamberStatus, { border: string; badge: string; icon: JSX.Element }> = {
  normal:  { border: 'border-green-200 dark:border-emerald-800/80',  badge: 'bg-green-100 text-green-800 dark:bg-emerald-950/70 dark:text-emerald-300', icon: <CheckCircle size={13} className="text-green-600 dark:text-emerald-400 shrink-0" aria-hidden="true" /> },
  warning: { border: 'border-amber-200 dark:border-amber-800/80',  badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300', icon: <AlertCircle size={13} className="text-amber-500 dark:text-amber-400 shrink-0" aria-hidden="true" /> },
  fault:   { border: 'border-red-300 dark:border-red-800/80',    badge: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300',     icon: <AlertTriangle size={13} className="text-red-500 dark:text-red-400 shrink-0" aria-hidden="true" /> },
  unknown: { border: 'border-gray-200 dark:border-gray-700',   badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',   icon: <CheckCircle size={13} className="text-gray-400 shrink-0" aria-hidden="true" /> },
};

export function ChamberTile({ chamber, recentReadings, alert, onClick }: ChamberTileProps) {
  const T = useT();
  const status = getChamberStatus(alert);
  const styles = STATUS_STYLES[status];
  const statusLabel = status === 'normal'
    ? (T.status_normal || 'Normal')
    : status === 'warning'
    ? (T.status_warning || 'Warning')
    : status === 'fault'
    ? (T.fault_alert_badge || 'Fault Alert')
    : (T.unknown || 'Unknown');
  const last = recentReadings[recentReadings.length - 1];

  // Sparkline data: last 24 readings
  const sparkData = recentReadings.slice(-24).map((r, i) => ({ i, v: r.tempC }));

  return (
    <button
      onClick={onClick}
      aria-label={`View ${chamber.name} digital twin details, status ${statusLabel}`}
      className={`card flex flex-col gap-3 text-left hover:shadow-md transition-all cursor-pointer border ${styles.border} focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 dark:focus-visible:ring-cold-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">{chamber.name}</div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
          {styles.icon}
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Temperature & Humidity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Thermometer size={16} className="text-cold-500 dark:text-cold-400" aria-hidden="true" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {last ? `${last.tempC.toFixed(1)}°C` : '—'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-400">({T.target || 'target'} {chamber.targetTempC}°C)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets size={14} className="text-blue-400 dark:text-blue-300" aria-hidden="true" />
          <span className="text-sm text-gray-600 dark:text-gray-300">{last ? `${last.humidity.toFixed(0)}%` : '—'}</span>
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
          <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center h-full">{T.no_data || 'No data'}</div>
        )}
      </div>

      {/* Risk score */}
      {alert && (
        <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
          <span>{T.fault_risk || 'Fault Risk'}:</span>
          <span className={`font-semibold inline-flex items-center gap-1 ${
            alert.level === 'red' ? 'text-red-600 dark:text-red-400' : alert.level === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-emerald-400'
          }`}>
            {alert.level === 'red' ? (
              <AlertTriangle size={13} aria-hidden="true" />
            ) : alert.level === 'amber' ? (
              <AlertCircle size={13} aria-hidden="true" />
            ) : (
              <CheckCircle size={13} aria-hidden="true" />
            )}
            <span>
              {alert.riskScore}/100 ({alert.level === 'red' ? T.risk_high : alert.level === 'amber' ? T.risk_medium : T.risk_low})
            </span>
          </span>
        </div>
      )}
    </button>
  );
}
