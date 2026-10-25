import { useState } from 'react';
import { ShoppingCart, HelpCircle } from 'lucide-react';
import { UrgencyChip } from '@/components/ui/UrgencyChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useT } from '@/i18n';
import type { RankedLot } from '@/types';

interface SellFirstCardProps {
  rankedLots: RankedLot[];
  limit?: number;
}

export function SellFirstCard({ rankedLots, limit = 8 }: SellFirstCardProps) {
  const T = useT();
  const [expandedLot, setExpandedLot] = useState<string | null>(null);
  const visible = rankedLots.slice(0, limit);

  const colorForUrgency = (u: string) =>
    u === 'red' ? 'red' : u === 'amber' ? 'amber' : 'green';

  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="bg-cold-50 p-2 rounded-lg">
          <ShoppingCart size={18} className="text-cold-700" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{T.sell_first}</h2>
          <p className="text-xs text-gray-400">{T.sell_first_sub}</p>
        </div>
      </div>

      {/* Estimate disclaimer */}
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
        {T.estimates}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="text-sm text-gray-400 py-4 text-center">No lots loaded. Click "Load Demo Data" to see the Sell First list.</div>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {visible.map(item => {
            const progress = Math.max(0, Math.min(1, item.remainingDays / (item.lot.produce === 'onion' ? 120 : item.lot.produce === 'potato' ? 90 : item.lot.produce === 'apple' ? 60 : 21)));
            const isExpanded = expandedLot === item.lot.id;
            return (
              <div key={item.lot.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  {/* Rank + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-5 text-right shrink-0">#{item.rank}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{item.lot.id}</span>
                        <span className="text-xs text-gray-500 capitalize">{item.lot.produce}</span>
                        <span className="text-xs text-gray-400">{item.lot.chamberId}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{item.lot.farmerName}</div>
                      {/* Shelf life bar */}
                      <div className="mt-1.5">
                        <ProgressBar value={progress} color={colorForUrgency(item.urgency) as any} />
                      </div>
                    </div>
                  </div>

                  {/* Days + chip */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <UrgencyChip level={item.urgency} />
                    <span className="text-xs text-gray-600">
                      ~{item.remainingDays.toFixed(0)} {T.days}
                    </span>
                    <span className="text-xs text-gray-400">
                      {T.range} {item.lowDays}–{item.highDays}
                    </span>
                  </div>
                </div>

                {/* Why button + expansion */}
                <button
                  onClick={() => setExpandedLot(isExpanded ? null : item.lot.id)}
                  className="mt-1.5 flex items-center gap-1 text-xs text-cold-600 hover:text-cold-800"
                >
                  <HelpCircle size={12} />
                  <span>{T.why}</span>
                </button>
                {isExpanded && (
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
                    {item.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
