import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';
import type { Language, ProduceMeta } from '@/types';
import { Save, RotateCcw, AlertCircle, Check, HelpCircle } from 'lucide-react';
import { DEFAULT_PRODUCE_META } from '@/engine/demoData';

export default function Settings() {
  const T = useT();
  const { settings, updateSettings, produceMeta, updateProduceMeta, clearData, openTour } = useStore();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [tariff, setTariff] = useState(settings.tariffINRperKwh.toString());
  const [language, setLanguage] = useState<Language>(settings.language);
  const [riskThreshold, setRiskThreshold] = useState(settings.alertThresholds.riskScoreAlert.toString());
  const [tempDevThreshold, setTempDevThreshold] = useState(settings.alertThresholds.tempDeviationAlert.toString());
  const [shelfRed, setShelfRed] = useState(settings.alertThresholds.shelfLifeRedDays.toString());
  const [shelfAmber, setShelfAmber] = useState(settings.alertThresholds.shelfLifeAmberDays.toString());

  const [localProduce, setLocalProduce] = useState<ProduceMeta[]>(produceMeta);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleProduceChange = (index: number, field: keyof ProduceMeta, value: string | number) => {
    const updated = [...localProduce];
    updated[index] = {
      ...updated[index],
      [field]:
        field === 'minSafeTempC'
          ? value === '' ? undefined : parseFloat(value as string) || 0
          : typeof updated[index][field] === 'number'
          ? parseFloat(value as string) || 0
          : value,
    };
    setLocalProduce(updated);
  };

  const handleSave = () => {
    updateSettings({
      storeName,
      tariffINRperKwh: parseFloat(tariff) || 8,
      language,
      alertThresholds: {
        riskScoreAlert: parseFloat(riskThreshold) || 60,
        tempDeviationAlert: parseFloat(tempDevThreshold) || 2,
        shelfLifeRedDays: parseFloat(shelfRed) || 3,
        shelfLifeAmberDays: parseFloat(shelfAmber) || 7,
      },
    });
    updateProduceMeta(localProduce);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleResetDefaults = () => {
    setLocalProduce(DEFAULT_PRODUCE_META);
  };

  const inputCls =
    'w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-500';
  const labelCls = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{T.nav_settings}</h1>
            <button
              type="button"
              onClick={openTour}
              className="inline-flex items-center gap-1 text-xs text-cold-700 dark:text-cold-400 hover:text-cold-900 dark:hover:text-cold-300 font-semibold underline underline-offset-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 rounded px-1 py-0.5"
            >
              <RotateCcw size={12} aria-hidden="true" />
              <span>{T.replay_tour}</span>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{T.general_config_sub}</p>
        </div>
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          {savedMessage ? <Check size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          <span>{savedMessage ? T.saved_successfully : T.save}</span>
        </button>
      </div>

      {/* Guided Tour Banner */}
      <div className="card bg-cold-50/50 dark:bg-cold-950/30 border-cold-200/60 dark:border-cold-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-cold-100 dark:bg-cold-900 text-cold-700 dark:text-cold-300 rounded-lg shrink-0">
            <HelpCircle size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{T.walkthrough_title}</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {T.tour_banner_desc}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openTour}
          className="btn-secondary text-cold-700 dark:text-cold-300 border-cold-300 dark:border-cold-800 hover:bg-white dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 shrink-0 min-h-[44px]"
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>{T.replay_tour}</span>
        </button>
      </div>

      {/* General Configuration */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{T.general_config}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{T.store_name}</label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{T.tariff}</label>
            <input
              type="number"
              step="0.5"
              value={tariff}
              onChange={e => setTariff(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{T.language}</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              className={inputCls}
            >
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Thresholds */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{T.thresholds}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {T.thresholds_sub}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>{T.fault_risk_score_alert}</label>
            <input
              type="number"
              value={riskThreshold}
              onChange={e => setRiskThreshold(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{T.max_temp_deviation}</label>
            <input
              type="number"
              step="0.5"
              value={tempDevThreshold}
              onChange={e => setTempDevThreshold(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{T.urgent_shelf_red}</label>
            <input
              type="number"
              value={shelfRed}
              onChange={e => setShelfRed(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{T.warning_shelf_amber}</label>
            <input
              type="number"
              value={shelfAmber}
              onChange={e => setShelfAmber(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Produce Library */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{T.produce_library}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{T.produce_library_sub}</p>
          </div>
          <button
            onClick={handleResetDefaults}
            className="text-xs text-cold-600 dark:text-cold-400 hover:text-cold-800 dark:hover:text-cold-300 flex items-center gap-1 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 rounded"
          >
            <RotateCcw size={12} aria-hidden="true" /> {T.reset_defaults}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.produce}</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.ideal_temp}</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.min_safe_temp}</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.ideal_humidity}</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.base_life} ({T.days})</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.q10_factor}</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300">{T.agronomic_notes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {localProduce.map((p, idx) => (
                <tr key={p.produce} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100 capitalize">{p.produce}</td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.5"
                      value={p.idealTempC}
                      onChange={e => handleProduceChange(idx, 'idealTempC', e.target.value)}
                      className="w-16 text-right border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.5"
                      placeholder={T.none}
                      value={p.minSafeTempC ?? ''}
                      onChange={e => handleProduceChange(idx, 'minSafeTempC', e.target.value)}
                      className="w-16 text-right border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      value={p.idealHumidity}
                      onChange={e => handleProduceChange(idx, 'idealHumidity', e.target.value)}
                      className="w-16 text-right border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      value={p.baseShelfLifeDays}
                      onChange={e => handleProduceChange(idx, 'baseShelfLifeDays', e.target.value)}
                      className="w-16 text-right border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={p.q10Factor}
                      onChange={e => handleProduceChange(idx, 'q10Factor', e.target.value)}
                      className="w-16 text-right border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={p.notes}
                      onChange={e => handleProduceChange(idx, 'notes', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-100 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">{T.reset_clear_data}</h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Clear all readings, lots, and simulated faults from browser storage. You can restore demo data at any time from the Data Input page.
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all loaded data?')) {
                clearData();
              }
            }}
            className="btn-danger"
          >
            {T.clear_stored_data}
          </button>
        </div>
      </div>
    </div>
  );
}
