import { Zap } from 'lucide-react';
import { useT } from '@/i18n';
import type { EnergyWasteEstimate } from '@/types';

interface EnergyWasteCardProps {
  estimates: EnergyWasteEstimate[];
  totalKwh: number;
  totalCostINR: number;
}

export function EnergyWasteCard({ estimates, totalKwh, totalCostINR }: EnergyWasteCardProps) {
  const T = useT();
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-yellow-50 p-2 rounded-lg">
          <Zap size={16} className="text-yellow-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{T.energy_waste}</h3>
          <p className="text-xs text-gray-400">{T.estimates}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-3">
        <div>
          <div className="text-2xl font-bold text-gray-900">{totalKwh.toFixed(1)}</div>
          <div className="text-xs text-gray-400">{T.extra_kwh}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-700">₹{totalCostINR.toFixed(0)}</div>
          <div className="text-xs text-gray-400">{T.extra_cost}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {estimates.filter(e => e.extraKwh > 0).map(e => (
          <div key={e.chamberId} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
            <span className="font-medium">{e.chamberId}:</span> {e.reason}
          </div>
        ))}
        {estimates.every(e => e.extraKwh <= 0) && (
          <div className="text-xs text-green-600">All chambers within normal energy use.</div>
        )}
      </div>
    </div>
  );
}
