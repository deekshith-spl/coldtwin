import { useState, useMemo, useRef } from 'react';
import { Printer, Download, FileText, UserCheck, Shield } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';
import { rankLots } from '@/engine/ranking';
import { computeFaultAlert } from '@/engine/faultDetection';
import { computeThermalPredictions } from '@/engine/thermalTwin';
import { UrgencyChip } from '@/components/ui/UrgencyChip';
import Papa from 'papaparse';

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Printable Sell-First List ──────────────────────────────────
function SellFirstPrint() {
  const { lots, readings, produceMeta, settings, role, currentFarmerId } = useStore();
  const T = useT();

  // If farmer view, restrict to that farmer's lots only (never fall back to all lots)
  const visibleLots = role === 'farmer'
    ? (currentFarmerId ? lots.filter(l => l.farmerId === currentFarmerId) : [])
    : lots;

  const ranked = useMemo(
    () => rankLots(visibleLots, readings, produceMeta, settings.alertThresholds),
    [visibleLots, readings, produceMeta, settings.alertThresholds]
  );

  return (
    <div id="sell-first-print" className="bg-white dark:bg-gray-900 p-8 max-w-3xl mx-auto transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-900 dark:border-gray-100">
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{T.todays_sell_first.toUpperCase()}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{settings.storeName}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="text-right text-xs text-gray-400">
          <div>{T.estimates_disclaimer}</div>
        </div>
      </div>

      {/* Table */}
      {ranked.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No lots to display.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 dark:border-gray-700">
              <th className="text-left py-2 pr-4 text-xs font-bold text-gray-600 dark:text-gray-300">#</th>
              <th className="text-left py-2 pr-4 text-xs font-bold text-gray-600 dark:text-gray-300">{T.lot_id}</th>
              <th className="text-left py-2 pr-4 text-xs font-bold text-gray-600 dark:text-gray-300">{T.produce}</th>
              <th className="text-left py-2 pr-4 text-xs font-bold text-gray-600 dark:text-gray-300">{T.chamber}</th>
              {role !== 'farmer' && (
                <th className="text-left py-2 pr-4 text-xs font-bold text-gray-600 dark:text-gray-300">{T.farmer}</th>
              )}
              <th className="text-left py-2 pr-4 text-xs font-bold text-gray-600 dark:text-gray-300">{T.quantity}</th>
              <th className="text-left py-2 pr-4 text-xs font-bold text-gray-600 dark:text-gray-300">{T.remaining_life}</th>
              <th className="text-left py-2 text-xs font-bold text-gray-600 dark:text-gray-300">{T.status_label || "STATUS"}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(item => (
              <tr key={item.lot.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">{item.rank}</td>
                <td className="py-3 pr-4 font-bold text-gray-900 dark:text-gray-100">{item.lot.id}</td>
                <td className="py-3 pr-4 text-gray-900 dark:text-gray-100 capitalize">{item.lot.produce}</td>
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{item.lot.chamberId}</td>
                {role !== 'farmer' && (
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{item.lot.farmerName}</td>
                )}
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{item.lot.quantityKg.toLocaleString()}</td>
                <td className="py-3 pr-4">
                  <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{item.remainingDays.toFixed(0)}</span>
                  <span className="text-xs text-gray-400 ml-1">({item.lowDays}–{item.highDays} {T.days})</span>
                </td>
                <td className="py-3">
                  <UrgencyChip level={item.urgency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400">
        <strong>IMPORTANT:</strong> All shelf-life estimates are generated by a physics software model using temperature and time data.
        They are indicative only and should be verified by visual inspection before selling.
      </div>
    </div>
  );
}

// ── Farmer Report ──────────────────────────────────────────────
function FarmerReport({ farmerId }: { farmerId: string }) {
  const { lots, readings, produceMeta, farmers, settings, role, currentFarmerId } = useStore();
  const T = useT();
  // Privacy: If the active role is farmer, force farmerId to be strictly currentFarmerId
  const effectiveId = role === 'farmer' ? (currentFarmerId ?? '') : farmerId;
  const farmer = farmers.find(f => f.id === effectiveId) ?? { id: effectiveId, name: effectiveId };
  const farmerLots = effectiveId ? lots.filter(l => l.farmerId === effectiveId) : [];
  const ranked = useMemo(
    () => rankLots(farmerLots, readings, produceMeta, settings.alertThresholds),
    [farmerLots, readings, produceMeta, settings.alertThresholds]
  );

  return (
    <div className="bg-white dark:bg-gray-900 p-8 max-w-2xl mx-auto transition-colors">
      <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-900 dark:border-gray-100">
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{T.lot_status_report}</div>
          <div className="text-lg font-bold text-cold-700 dark:text-cold-400 mt-1">{farmer.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="text-right text-xs text-gray-400">
          <div>ColdTwin · {T.estimates}</div>
          <div>For information purposes only</div>
        </div>
      </div>

      {ranked.map(item => (
        <div key={item.lot.id} className="mb-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-lg text-gray-900 dark:text-white">{item.lot.id}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                {item.lot.produce} · {item.lot.quantityKg} kg · {item.lot.chamberId}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{T.arrival_date}: {item.lot.arrivalDate}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-gray-900 dark:text-white">{item.remainingDays.toFixed(0)}</div>
              <div className="text-xs text-gray-400">{T.days_remaining || 'days remaining'}</div>
              <div className="text-xs text-gray-400 mt-0.5">({T.range} {item.lowDays}–{item.highDays})</div>
              <div className="mt-1"><UrgencyChip level={item.urgency} /></div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 p-2.5 rounded border border-gray-100 dark:border-gray-800">
            {item.explanation}
          </div>
        </div>
      ))}

      {ranked.length === 0 && (
        <div className="text-center text-gray-400 py-8">{T.no_lots_for_farmer}</div>
      )}

      <div className="mt-6 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
        {T.estimates_disclaimer}
      </div>
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────
export default function Reports() {
  const T = useT();
  const { lots, readings, produceMeta, chambers, farmers, settings, role, currentFarmerId } = useStore();
  const [selectedFarmer, setSelectedFarmer] = useState<string>('');
  const [reportType, setReportType] = useState<'sell-first' | 'farmer'>('sell-first');
  const printRef = useRef<HTMLDivElement>(null);

  const isFarmerRole = role === 'farmer';
  const effectiveFarmerId = isFarmerRole
    ? (currentFarmerId ?? '')
    : (selectedFarmer || (farmers[0]?.id ?? ''));

  // If farmer role, strictly restrict lots to the current farmer (never all lots if unset)
  const relevantLots = isFarmerRole
    ? (effectiveFarmerId ? lots.filter(l => l.farmerId === effectiveFarmerId) : [])
    : lots;

  const ranked = useMemo(
    () => rankLots(relevantLots, readings, produceMeta, settings.alertThresholds),
    [relevantLots, readings, produceMeta, settings.alertThresholds]
  );

  const alerts = useMemo(() => chambers.map(chamber => {
    const cr = readings.filter(r => r.chamberId === chamber.id);
    const preds = computeThermalPredictions(chamber, cr);
    return computeFaultAlert(chamber, cr, preds, settings.alertThresholds);
  }), [chambers, readings, settings.alertThresholds]);

  const handlePrint = () => window.print();

  const exportRankings = () => {
    exportToCSV(ranked.map(r => ({
      rank: r.rank,
      lotId: r.lot.id,
      produce: r.lot.produce,
      chamberId: r.lot.chamberId,
      farmerName: r.lot.farmerName,
      quantityKg: r.lot.quantityKg,
      remainingDays: r.remainingDays,
      lowDays: r.lowDays,
      highDays: r.highDays,
      urgency: r.urgency,
    })), isFarmerRole ? `coldtwin_farmer_${effectiveFarmerId}_lots.csv` : 'coldtwin_sell_first_list.csv');
  };

  const exportAlerts = () => {
    exportToCSV(alerts.map(a => ({
      chamberId: a.chamberId,
      riskScore: a.riskScore,
      level: a.level,
      reason: a.reason,
      suggestedAction: a.suggestedAction,
    })), 'coldtwin_alerts.csv');
  };

  const uniqueFarmers = [...new Set(lots.map(l => l.farmerId))]
    .map(id => farmers.find(f => f.id === id) ?? { id, name: id });

  const activeFarmerObj = farmers.find(f => f.id === effectiveFarmerId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{T.nav_reports}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{T.reports_sub}</p>
      </div>

      {/* Role-based Banner for Farmer */}
      {isFarmerRole && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3.5 rounded-xl text-sm text-blue-900 dark:text-blue-200">
          <Shield size={18} className="shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>
            {T.role_farmer}: {T.viewing_private_lots_for || 'viewing private lots for'} <strong>{activeFarmerObj?.name || effectiveFarmerId}</strong>.
          </span>
        </div>
      )}

      {/* Controls – hidden during print */}
      <div className="no-print flex flex-wrap gap-3 items-center">
        {!isFarmerRole ? (
          <>
            <button
              type="button"
              onClick={() => setReportType('sell-first')}
              className={`btn-${reportType === 'sell-first' ? 'primary' : 'secondary'} flex items-center gap-1.5`}
            >
              <FileText size={14} aria-hidden="true" />
              <span>{T.todays_sell_first}</span>
            </button>
            <button
              type="button"
              onClick={() => setReportType('farmer')}
              className={`btn-${reportType === 'farmer' ? 'primary' : 'secondary'} flex items-center gap-1.5`}
            >
              <FileText size={14} aria-hidden="true" />
              <span>{T.farmer_report}</span>
            </button>
            <span className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:inline-block" />
          </>
        ) : null}

        <button
          type="button"
          onClick={exportRankings}
          className="btn-secondary flex items-center gap-1.5"
        >
          <Download size={14} aria-hidden="true" />
          <span>{isFarmerRole ? (T.export_my_lots || 'Export My Lots CSV') : T.export_rankings}</span>
        </button>

        {!isFarmerRole && (
          <button
            type="button"
            onClick={exportAlerts}
            className="btn-secondary flex items-center gap-1.5"
          >
            <Download size={14} aria-hidden="true" />
            <span>{T.export_alerts}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handlePrint}
          className="btn-primary flex items-center gap-1.5"
        >
          <Printer size={14} aria-hidden="true" />
          <span>{T.print}</span>
        </button>
      </div>

      {/* Farmer selector (only shown to staff / owner when on farmer report) */}
      {!isFarmerRole && reportType === 'farmer' && (
        <div className="no-print card py-3.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
            {T.select_farmer}
          </label>
          <select
            aria-label={T.select_farmer}
            value={selectedFarmer}
            onChange={e => setSelectedFarmer(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600"
          >
            <option value="">{T.choose_farmer}</option>
            {uniqueFarmers.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Report preview */}
      <div ref={printRef} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        {isFarmerRole ? (
          effectiveFarmerId ? (
            <FarmerReport farmerId={effectiveFarmerId} />
          ) : (
            <div className="p-12 text-center text-gray-400 bg-white dark:bg-gray-900">
              {T.no_lots_for_farmer}
            </div>
          )
        ) : reportType === 'sell-first' ? (
          <SellFirstPrint />
        ) : selectedFarmer ? (
          <FarmerReport farmerId={selectedFarmer} />
        ) : (
          <div className="p-12 text-center text-gray-400 bg-white dark:bg-gray-900">
            {T.preview_farmer_prompt}
          </div>
        )}
      </div>
    </div>
  );
}
