import { TrendingUp, Info, AlertTriangle, Clock } from 'lucide-react';
import { useT } from '@/i18n';
import type { RankedLot } from '@/types';

interface SavingsSummaryCardProps {
  rankedLots: RankedLot[];
  totalExtraCostINR: number;
}

export function SavingsSummaryCard({ rankedLots, totalExtraCostINR }: SavingsSummaryCardProps) {
  const T = useT();
  const redLots   = rankedLots.filter(l => l.urgency === 'red').length;
  const amberLots = rankedLots.filter(l => l.urgency === 'amber').length;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-green-50 p-2 rounded-lg">
          <TrendingUp size={16} className="text-green-600" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{T.savings_summary}</h3>
          <p className="text-xs text-gray-400">{T.estimates}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600 shrink-0" aria-hidden="true" />
            <div className="text-2xl font-bold text-red-700">{redLots}</div>
          </div>
          <div className="text-xs text-red-700 font-medium mt-1">Urgent: Need immediate sale</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-600 shrink-0" aria-hidden="true" />
            <div className="text-2xl font-bold text-amber-700">{amberLots}</div>
          </div>
          <div className="text-xs text-amber-700 font-medium mt-1">Soon: Sell within 7 days</div>
        </div>
      </div>

      {totalExtraCostINR > 0 && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
          <div className="text-sm font-medium text-yellow-800">
            Estimated excess energy cost this period:
            <span className="font-bold ml-1">₹{totalExtraCostINR.toFixed(0)}</span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-1.5 mt-3 text-xs text-gray-400">
        <Info size={12} className="shrink-0 mt-0.5" />
        <span>
          These are rough estimates based on synthetic data and simplified models.
          Real savings depend on many factors. Validate with your store's actual data.
        </span>
      </div>
    </div>
  );
}
