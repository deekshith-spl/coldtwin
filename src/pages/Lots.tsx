import { useState, useMemo } from 'react';
import { Search, Filter, X, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';
import { rankLots } from '@/engine/ranking';
import { computeShelfLifeEstimate } from '@/engine/shelfLife';
import { UrgencyChip } from '@/components/ui/UrgencyChip';
import { ShelfLifeChart } from '@/components/ui/ShelfLifeChart';
import type { RankedLot } from '@/types';

function LotDrawer({ lot, onClose }: { lot: RankedLot; onClose: () => void }) {
  const { readings, produceMeta } = useStore();
  const meta = produceMeta.find(m => m.produce === lot.lot.produce) ?? {
    produce: lot.lot.produce, idealTempC: 5, idealHumidity: 85,
    baseShelfLifeDays: 14, q10Factor: 2.0, notes: '',
  };

  const chamberReadings = readings
    .filter(r => r.chamberId === lot.lot.chamberId &&
      new Date(r.timestamp) >= new Date(lot.lot.arrivalDate))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-48);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-base font-bold text-gray-900">{lot.lot.id} – {lot.lot.produce}</h2>
            <p className="text-xs text-gray-400">{lot.lot.farmerName} · {lot.lot.chamberId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lot details"
            className="min-w-[44px] min-h-[44px] p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 p-5 flex flex-col gap-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Produce',       value: lot.lot.produce },
              { label: 'Quantity',      value: `${lot.lot.quantityKg} kg` },
              { label: 'Arrival Date',  value: lot.lot.arrivalDate },
              { label: 'Farmer',        value: lot.lot.farmerName },
              { label: 'Chamber',       value: lot.lot.chamberId },
              { label: 'Ideal Temp',    value: `${meta.idealTempC}°C` },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400">{item.label}</div>
                <div className="text-sm font-medium text-gray-900 capitalize">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Shelf life */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Shelf Life Estimate</h3>
              <UrgencyChip level={lot.urgency} />
            </div>
            <div className="flex gap-4 mb-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">{lot.remainingDays.toFixed(1)}</div>
                <div className="text-xs text-gray-400">days remaining (central)</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-600">{lot.lowDays} – {lot.highDays}</div>
                <div className="text-xs text-gray-400">pessimistic – optimistic range</div>
              </div>
            </div>
            <ShelfLifeChart
              remainingDays={lot.remainingDays}
              lowDays={lot.lowDays}
              highDays={lot.highDays}
              totalDays={meta.baseShelfLifeDays}
            />
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2 leading-relaxed">
              <strong>Why this estimate:</strong> {lot.explanation}
            </div>
          </div>

          {/* Recent readings */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Chamber Readings</h3>
            {chamberReadings.length === 0 ? (
              <div className="text-xs text-gray-400">No readings for this chamber after arrival date.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-gray-400 border-b">
                      <th className="text-left py-1 pr-3">Time</th>
                      <th className="text-right pr-3">Temp</th>
                      <th className="text-right pr-3">Humidity</th>
                      <th className="text-right">Door</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chamberReadings.slice(-10).map(r => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="py-1 pr-3 text-gray-500">
                          {new Date(r.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="text-right pr-3 font-mono">{r.tempC.toFixed(1)}°C</td>
                        <td className="text-right pr-3 font-mono">{r.humidity.toFixed(0)}%</td>
                        <td className="text-right">{r.doorOpenCount > 0 ? `${r.doorOpenCount}×` : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Lots() {
  const T = useT();
  const { lots, readings, produceMeta, role, currentFarmerId, settings } = useStore();
  const [search, setSearch] = useState('');
  const [filterProduce, setFilterProduce] = useState('');
  const [filterChamber, setFilterChamber] = useState('');
  const [filterFarmer, setFilterFarmer]   = useState('');
  const [selectedLot, setSelectedLot]     = useState<RankedLot | null>(null);

  const visibleLots = role === 'farmer' && currentFarmerId
    ? lots.filter(l => l.farmerId === currentFarmerId)
    : lots;

  const ranked = useMemo(
    () => rankLots(visibleLots, readings, produceMeta, settings.alertThresholds),
    [visibleLots, readings, produceMeta, settings.alertThresholds]
  );

  const filtered = ranked.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      item.lot.id.toLowerCase().includes(q) ||
      item.lot.produce.toLowerCase().includes(q) ||
      item.lot.farmerName.toLowerCase().includes(q);
    const matchProduce  = !filterProduce  || item.lot.produce  === filterProduce;
    const matchChamber  = !filterChamber  || item.lot.chamberId === filterChamber;
    const matchFarmer   = !filterFarmer   || item.lot.farmerId  === filterFarmer;
    return matchSearch && matchProduce && matchChamber && matchFarmer;
  });

  const produces = [...new Set(lots.map(l => l.produce))];
  const chamberIds = [...new Set(lots.map(l => l.chamberId))];
  const farmers = [...new Set(lots.map(l => ({ id: l.farmerId, name: l.farmerName })).map(f => JSON.stringify(f)))].map(s => JSON.parse(s));

  const selCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-cold-500';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{T.nav_lots}</h1>
          <p className="text-sm text-gray-500">{filtered.length} lots{filtered.length > 0 ? `, sorted by urgency` : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search lots, farmers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-cold-500"
          />
        </div>
        <select value={filterProduce} onChange={e => setFilterProduce(e.target.value)} className={selCls}>
          <option value="">All Produce</option>
          {produces.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <select value={filterChamber} onChange={e => setFilterChamber(e.target.value)} className={selCls}>
          <option value="">All Chambers</option>
          {chamberIds.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {role !== 'farmer' && (
          <select value={filterFarmer} onChange={e => setFilterFarmer(e.target.value)} className={selCls}>
            <option value="">All Farmers</option>
            {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        {(search || filterProduce || filterChamber || filterFarmer) && (
          <button onClick={() => { setSearch(''); setFilterProduce(''); setFilterChamber(''); setFilterFarmer(''); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card py-12 text-center text-gray-400">
          <div className="text-3xl mb-2">📦</div>
          <div className="text-sm">No lots found. Load demo data or add lots via Data Input.</div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">#</th>
                <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Lot / Produce</th>
                <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Chamber</th>
                {role !== 'farmer' && <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Farmer</th>}
                <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">Qty (kg)</th>
                <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Remaining Life</th>
                <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr
                  key={item.lot.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for lot ${item.lot.id}, ${item.lot.produce}, status ${item.urgency}`}
                  className="hover:bg-gray-50 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 focus-visible:ring-inset"
                  onClick={() => setSelectedLot(item)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedLot(item);
                    }
                  }}
                >
                  <td className="py-3 px-4 text-gray-400 font-bold">{item.rank}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{item.lot.id}</div>
                    <div className="text-xs text-gray-400 capitalize">{item.lot.produce}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{item.lot.chamberId}</td>
                  {role !== 'farmer' && <td className="py-3 px-4 text-gray-600">{item.lot.farmerName}</td>}
                  <td className="py-3 px-4 text-right text-gray-600">{item.lot.quantityKg.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-gray-900">{item.remainingDays.toFixed(1)} days</span>
                    <span className="text-xs text-gray-400 ml-1">({item.lowDays}–{item.highDays})</span>
                  </td>
                  <td className="py-3 px-4"><UrgencyChip level={item.urgency} /></td>
                  <td className="py-3 px-4"><ChevronRight size={16} className="text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {selectedLot && (
        <LotDrawer lot={selectedLot} onClose={() => setSelectedLot(null)} />
      )}
    </div>
  );
}
