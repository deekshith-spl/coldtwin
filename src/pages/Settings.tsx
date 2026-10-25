import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';
import type { Language, ProduceMeta } from '@/types';
import { Save, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { DEFAULT_PRODUCE_META } from '@/engine/demoData';

export default function Settings() {
  const T = useT();
  const { settings, updateSettings, produceMeta, updateProduceMeta, clearData } = useStore();

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
      [field]: typeof updated[index][field] === 'number' ? parseFloat(value as string) || 0 : value,
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

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cold-500';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{T.nav_settings}</h1>
          <p className="text-sm text-gray-500 mt-1">Configure facility parameters, electricity tariffs, and produce baseline values.</p>
        </div>
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          {savedMessage ? <Check size={16} /> : <Save size={16} />}
          <span>{savedMessage ? 'Saved Successfully' : T.save}</span>
        </button>
      </div>

      {/* General Configuration */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">General Configuration</h2>
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
        <h2 className="text-base font-semibold text-gray-900 mb-1">{T.thresholds}</h2>
        <p className="text-xs text-gray-500 mb-4">Customize triggers for equipment fault risks and produce urgency.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Fault Risk Alert Score (0-100)</label>
            <input
              type="number"
              value={riskThreshold}
              onChange={e => setRiskThreshold(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Temp Deviation (°C)</label>
            <input
              type="number"
              step="0.5"
              value={tempDevThreshold}
              onChange={e => setTempDevThreshold(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Urgent Shelf-Life Red (&lt; days)</label>
            <input
              type="number"
              value={shelfRed}
              onChange={e => setShelfRed(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Warning Shelf-Life Amber (&lt; days)</label>
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
            <h2 className="text-base font-semibold text-gray-900">Produce Reference Library</h2>
            <p className="text-xs text-gray-500">Ideal parameters and Q10 rate constants used for shelf-life estimations.</p>
          </div>
          <button
            onClick={handleResetDefaults}
            className="text-xs text-cold-600 hover:text-cold-800 flex items-center gap-1 font-medium"
          >
            <RotateCcw size={12} /> Reset to Default Values
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Produce</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Ideal Temp (°C)</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Ideal Humidity (%RH)</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Base Shelf Life (Days)</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Q10 Rate Factor</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Agronomic Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {localProduce.map((p, idx) => (
                <tr key={p.produce} className="hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900 capitalize">{p.produce}</td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.5"
                      value={p.idealTempC}
                      onChange={e => handleProduceChange(idx, 'idealTempC', e.target.value)}
                      className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      value={p.idealHumidity}
                      onChange={e => handleProduceChange(idx, 'idealHumidity', e.target.value)}
                      className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      value={p.baseShelfLifeDays}
                      onChange={e => handleProduceChange(idx, 'baseShelfLifeDays', e.target.value)}
                      className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={p.q10Factor}
                      onChange={e => handleProduceChange(idx, 'q10Factor', e.target.value)}
                      className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={p.notes}
                      onChange={e => handleProduceChange(idx, 'notes', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-100 bg-red-50/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900">Reset & Clear Data</h3>
            <p className="text-xs text-red-700 mt-1">
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
            Clear Stored Data
          </button>
        </div>
      </div>
    </div>
  );
}
