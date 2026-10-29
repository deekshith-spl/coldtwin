import { ShieldAlert, BookOpen, Cpu, Leaf, Info, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';

export default function Assumptions() {
  const T = useT();
  const { produceMeta, chambers, settings } = useStore();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{T.assumptions_title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {T.assumptions_sub}
        </p>
      </div>

      {/* Read-Only Disclaimer Callout */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 rounded-r-xl">
        <div className="flex items-start gap-3">
          <ShieldAlert className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">{T.read_only_decision_support}</h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              {T.read_only_disclaimer}
            </p>
          </div>
        </div>
      </div>

      {/* Honesty & No Accuracy Claims */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-cold-700 dark:text-cold-400" size={18} />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{T.no_hard_accuracy}</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {T.no_hard_accuracy_desc}
        </p>
      </div>

      {/* Produce Library Assumptions */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Leaf className="text-green-600 dark:text-green-400" size={18} />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{T.produce_assumptions_title}</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {T.produce_assumptions_desc}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.produce}</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.ideal_temp}</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.ideal_humidity}</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.base_life} ({T.days})</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.q10_factor}</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.agronomic_notes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {produceMeta.map(p => (
                <tr key={p.produce} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-900 capitalize">{p.produce}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{p.idealTempC}°C</td>
                  <td className="py-2.5 px-3 text-right font-mono">{p.idealHumidity}%</td>
                  <td className="py-2.5 px-3 text-right font-mono">{p.baseShelfLifeDays} {T.days}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{p.q10Factor}</td>
                  <td className="py-2.5 px-3 text-gray-500">{p.notes || 'Subject to local variety testing'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Physics Models Equations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Thermal Twin */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="text-cold-600" size={16} />
            <h3 className="text-sm font-semibold text-gray-900">1. Thermal Twin Model</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Simulates chamber temperature dynamics using a 1st-order lumped thermal capacitance equation:
          </p>
          <div className="bg-gray-50 p-2.5 rounded font-mono text-xs text-gray-800 mb-3 border border-gray-100">
            T(t+1) = T(t) + α·(T_amb - T(t)) - β·Comp_run + γ·Door_opens
          </div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• <strong>α (Insulation leakage):</strong> 0.04 hr⁻¹ default</li>
            <li>• <strong>β (Refrigeration pull-down):</strong> 1.5 °C/hr default</li>
            <li>• <strong>γ (Door ingress pulse):</strong> 0.6 °C per opening</li>
          </ul>
        </div>

        {/* Fault Detection */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="text-red-500" size={16} />
            <h3 className="text-sm font-semibold text-gray-900">2. Fault Risk Scoring (0–100)</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Composite statistical heuristic combining 4 weighted indicators:
          </p>
          <div className="bg-gray-50 p-2.5 rounded font-mono text-xs text-gray-800 mb-3 border border-gray-100">
            Risk = 0.35·Residual + 0.30·LearnedAnomaly + 0.20·Recovery + 0.15·DutyCycle
          </div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• <strong>Residual:</strong> EWMA (α=0.3) of (Actual - Expected)</li>
            <li>• <strong>Learned Anomaly:</strong> Hourly median and MAD residual divergence from chamber's own baseline</li>
            <li>• <strong>Recovery:</strong> Hours taken to return to setpoint after doors open</li>
            <li>• <strong>Duty Cycle:</strong> Normal baseline 30%–75% runtime</li>
          </ul>
        </div>

        {/* Shelf Life Degradation */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="text-indigo-600" size={16} />
            <h3 className="text-sm font-semibold text-gray-900">3. Shelf Life Kinetics</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Q10 Arrhenius-approximated biological respiration consumption:
          </p>
          <div className="bg-gray-50 p-2.5 rounded font-mono text-xs text-gray-800 mb-3 border border-gray-100">
            Rate = (1/BaseDays) · Q10^((T_avg - T_ideal)/10) · HumPenalty
          </div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• <strong>Q10 Factor:</strong> 2.0 to 3.0 (respiration rate multiple per 10°C)</li>
            <li>• <strong>Humidity Penalty:</strong> 1.05 to 1.30 multiplier on desiccation</li>
            <li>• <strong>Uncertainty Band:</strong> Expands with gaps in daily records</li>
          </ul>
        </div>

        {/* Energy Waste */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-yellow-600" size={16} />
            <h3 className="text-sm font-semibold text-gray-900">4. Energy Waste Computation</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Benchmarking actual compressor hours against a healthy operational baseline:
          </p>
          <div className="bg-gray-50 p-2.5 rounded font-mono text-xs text-gray-800 mb-3 border border-gray-100">
            Extra kWh = Max(0, ActualRunHours - 0.50·TotalHours) · kW_rating
          </div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• <strong>Healthy Baseline:</strong> 50% nominal average duty cycle</li>
            <li>• <strong>Tariff:</strong> Configurable (Current: ₹{settings.tariffINRperKwh}/kWh)</li>
            <li>• <strong>Cost:</strong> Extra kWh · Tariff</li>
          </ul>
        </div>

        {/* Learned Baseline Anomaly Detector */}
        <div className="card md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="text-cyan-600" size={16} />
            <h3 className="text-sm font-semibold text-gray-900">5. Learned Baseline Anomaly Detection (Statistical Learning on Demo Data)</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-2">
            Unsupervised statistical learning of diurnal chamber behavior:
          </p>
          <div className="bg-gray-50 p-2.5 rounded font-mono text-xs text-gray-800 mb-3 border border-gray-100">
            For each hour h ∈ [0..23]: Baseline_h = (Median(residuals_h), MAD(residuals_h))
            <br />
            Robust Z = |residual - Median_h| / (1.4826 · MAD_h)
          </div>
          <div className="text-xs text-gray-600 space-y-2">
            <p>
              • <strong>Methodology:</strong> Learns normal diurnal thermal behavior from the earlier part of each chamber&apos;s history, estimating typical residual offsets and dispersion (MAD) for every hour of the day.
            </p>
            <p className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-500 rounded text-amber-800 dark:text-amber-300">
              <strong>Demo Disclaimer &amp; No Accuracy Claims:</strong> This algorithm operates strictly as statistical learning on synthetic demo data for operator demonstration and decision-support modeling. No claims of operational accuracy, predictive precision, or real-world sensor validation are made. Real-world facilities require physical inspection, calibrated sensors, and empirical verification.
            </p>
          </div>
        </div>
      </div>

      {/* Chamber Metadata */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Active Chamber Baseline Specifications</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {chambers.map(c => (
            <div key={c.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
              <div className="font-bold text-gray-900">{c.name}</div>
              <div className="text-gray-500 mt-1">Setpoint: <span className="font-mono text-gray-800">{c.targetTempC}°C</span></div>
              <div className="text-gray-500">Design Ambient: <span className="font-mono text-gray-800">{c.ambientTempC}°C</span></div>
              <div className="text-gray-500">Compressor Rating: <span className="font-mono text-gray-800">{c.compressorKW} kW</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
