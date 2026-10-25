import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useT, t } from '@/i18n';
import { computeThermalPredictions } from '@/engine/thermalTwin';
import { computeFaultAlert } from '@/engine/faultDetection';
import { rankLots } from '@/engine/ranking';
import { computeEnergyWaste, totalEnergyWaste } from '@/engine/energyWaste';
import { SellFirstCard } from '@/components/dashboard/SellFirstCard';
import { FixBeforeBreaksCard } from '@/components/dashboard/FixBeforeBreaksCard';
import { ChamberTile } from '@/components/dashboard/ChamberTile';
import { EnergyWasteCard } from '@/components/dashboard/EnergyWasteCard';
import { SavingsSummaryCard } from '@/components/dashboard/SavingsSummaryCard';

export default function Dashboard() {
  const T = useT();
  const navigate = useNavigate();
  const { chambers, readings, lots, produceMeta, settings, role, currentFarmerId, loadDemoData } = useStore();

  // Filter lots by farmer role
  const visibleLots = role === 'farmer' && currentFarmerId
    ? lots.filter(l => l.farmerId === currentFarmerId)
    : lots;

  // Per-chamber computations
  const { alerts, energyEstimates, rankedLots } = useMemo(() => {
    const alerts = chambers.map(chamber => {
      const chamberReadings = readings.filter(r => r.chamberId === chamber.id);
      const predictions = computeThermalPredictions(chamber, chamberReadings);
      return computeFaultAlert(chamber, chamberReadings, predictions, settings.alertThresholds);
    });

    const energyEstimates = chambers.map(chamber => {
      const chamberReadings = readings.filter(r => r.chamberId === chamber.id);
      return computeEnergyWaste(chamber, chamberReadings, settings.tariffINRperKwh);
    });

    const rankedLots = rankLots(visibleLots, readings, produceMeta, settings.alertThresholds);

    return { alerts, energyEstimates, rankedLots };
  }, [chambers, readings, visibleLots, produceMeta, settings.tariffINRperKwh, settings.alertThresholds]);

  const { totalExtraKwh, totalExtraCostINR } = totalEnergyWaste(energyEstimates);

  // Determine status banner
  const highAlerts = alerts.filter(a => a.riskScore >= settings.alertThresholds.riskScoreAlert);
  const redLots    = rankedLots.filter(l => l.urgency === 'red');
  const attention  = highAlerts.length + redLots.length;

  const banner = attention === 0
    ? { level: 'green', icon: <CheckCircle size={16} aria-hidden="true" />, badge: 'Normal', text: T.status_all_normal }
    : attention <= 2
    ? { level: 'amber', icon: <AlertCircle size={16} aria-hidden="true" />, badge: 'Warning', text: t(T.status_attention, { n: attention }) }
    : { level: 'red',   icon: <AlertTriangle size={16} aria-hidden="true" />, badge: 'Critical', text: t(T.status_attention, { n: attention }) };

  const bannerStyle =
    banner.level === 'green'
      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
      : banner.level === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300';

  return (
    <div className="flex flex-col gap-5">
      {/* Status Banner with icon and explicit text badge */}
      <div className={`flex items-center gap-2.5 px-4 py-3 border rounded-xl font-medium text-sm transition-colors ${bannerStyle}`}>
        {banner.icon}
        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70 dark:bg-gray-900/80 border border-current">
          {banner.badge}
        </span>
        <span>{banner.text}</span>
      </div>

      {readings.length === 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-4 rounded-xl text-sm transition-colors">
          <div className="text-blue-900 dark:text-blue-200 font-medium">No facility readings loaded yet. Experience ColdTwin instantly with realistic 60-day multi-chamber data.</div>
          <button onClick={loadDemoData} className="btn-primary shrink-0 ml-4">{T.load_demo}</button>
        </div>
      )}

      {/* Hero: Sell First + Fix Before Breaks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SellFirstCard rankedLots={rankedLots} />
        <FixBeforeBreaksCard alerts={alerts} />
      </div>

      {/* Chamber Tiles */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          {T.chamber}s
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {chambers.map(chamber => {
            const chamberReadings = readings.filter(r => r.chamberId === chamber.id);
            const alert = alerts.find(a => a.chamberId === chamber.id);
            return (
              <ChamberTile
                key={chamber.id}
                chamber={chamber}
                recentReadings={chamberReadings}
                alert={alert}
                onClick={() => navigate(`/digital-twin?chamber=${chamber.id}`)}
              />
            );
          })}
        </div>
      </div>

      {/* Energy + Savings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <EnergyWasteCard
          estimates={energyEstimates}
          totalKwh={totalExtraKwh}
          totalCostINR={totalExtraCostINR}
        />
        <SavingsSummaryCard rankedLots={rankedLots} totalExtraCostINR={totalExtraCostINR} />
      </div>
    </div>
  );
}
