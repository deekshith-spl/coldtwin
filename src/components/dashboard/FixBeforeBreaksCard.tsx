import { useState } from 'react';
import { Wrench, HelpCircle, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { useT } from '@/i18n';
import type { FaultAlert } from '@/types';

interface FixBeforeBreaksCardProps {
  alerts: FaultAlert[];
}

export function FixBeforeBreaksCard({ alerts }: FixBeforeBreaksCardProps) {
  const T = useT();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const sortedAlerts = [...alerts].sort((a, b) => b.riskScore - a.riskScore);

  const levelIcon = (level: string) => {
    if (level === 'red')   return <AlertTriangle size={16} className="text-red-500" />;
    if (level === 'amber') return <AlertCircle size={16} className="text-amber-500" />;
    return <CheckCircle size={16} className="text-green-500" />;
  };

  const levelBorder = (level: string) =>
    level === 'red' ? 'border-l-4 border-l-red-400' :
    level === 'amber' ? 'border-l-4 border-l-amber-400' :
    'border-l-4 border-l-green-400';

  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="bg-red-50 p-2 rounded-lg">
          <Wrench size={18} className="text-red-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{T.fix_before_breaks}</h2>
          <p className="text-xs text-gray-400">{T.fix_before_sub}</p>
        </div>
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-2 text-green-600">
          <CheckCircle size={32} />
          <span className="text-sm font-medium">{T.no_alerts}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedAlerts.map(alert => {
            const isExpanded = expandedAlert === alert.chamberId;
            return (
              <div
                key={alert.chamberId}
                className={`rounded-lg bg-gray-50 p-3 ${levelBorder(alert.level)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {levelIcon(alert.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-semibold text-gray-900">{alert.chamberId}</div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          alert.level === 'red' ? 'bg-red-100 text-red-800 border-red-200' :
                          alert.level === 'amber' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-green-100 text-green-800 border-green-200'
                        }`}>
                          {alert.level === 'red' ? (T.critical_risk || 'Critical Risk') : alert.level === 'amber' ? (T.warning_risk || 'Warning') : (T.normal_risk || 'Normal')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
                        {alert.reason}
                      </p>
                    </div>
                  </div>
                  <RiskGauge score={alert.riskScore} />
                </div>

                <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1.5">
                  💡 {alert.suggestedAction}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.chamberId)}
                  className="mt-2 flex items-center gap-1 text-xs text-cold-600 hover:text-cold-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 rounded px-1 py-0.5"
                >
                  <HelpCircle size={12} />
                  <span>{T.why}</span>
                </button>

                {isExpanded && alert.topFactors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {alert.topFactors.map((factor, i) => (
                      <li key={i} className="text-xs text-gray-600 bg-white rounded px-2 py-1.5 border border-gray-100">
                        {i + 1}. {factor}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
