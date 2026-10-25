import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Plus, Download, FlaskConical, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';
import type { Reading, Lot } from '@/types';

type Tab = 'upload' | 'manual' | 'templates';

// ── CSV Template headers ──────────────────────────────────────
const READINGS_HEADERS = ['chamberId', 'timestamp', 'tempC', 'humidity', 'compressorRunHours', 'doorOpenCount', 'intervalHours'];
const LOTS_HEADERS     = ['id', 'produce', 'quantityKg', 'arrivalDate', 'farmerId', 'farmerName', 'chamberId', 'notes'];

function downloadCSV(headers: string[], filename: string) {
  const csv = headers.join(',') + '\n' +
    '# Fill in your data below this line. Delete this comment row.\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Upload Tab ────────────────────────────────────────────────
function UploadTab() {
  const T = useT();
  const { addReadings, addLot, loadDemoData } = useStore();
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<{ type: 'success' | 'error' | 'info'; text: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setMessages([{ type: 'info', text: `Processing "${file.name}"...` }]);

    const parseRows = (rows: Record<string, string>[]) => {
      // Detect if readings or lots by columns
      const isReadings = rows[0] && 'tempC' in rows[0] || 'chamberId' in rows[0];
      const msgs: typeof messages = [];

      if (isReadings) {
        const parsed: Reading[] = rows
          .filter(r => r.chamberId && r.timestamp && !r['#'])
          .map((r, i) => ({
            id: `UP_${Date.now()}_${i}`,
            chamberId: r.chamberId?.trim(),
            timestamp: r.timestamp?.trim() || new Date().toISOString(),
            tempC: parseFloat(r.tempC) || 0,
            humidity: parseFloat(r.humidity) || 80,
            compressorRunHours: parseFloat(r.compressorRunHours) || 0,
            doorOpenCount: parseInt(r.doorOpenCount) || 0,
            intervalHours: parseFloat(r.intervalHours) || 1,
          }));

        if (parsed.length === 0) {
          msgs.push({ type: 'error', text: 'No valid readings found. Check column names match the template.' });
        } else {
          addReadings(parsed);
          msgs.push({ type: 'success', text: `✓ Imported ${parsed.length} readings successfully.` });
        }
      } else {
        // Try as lots
        const parsed = rows
          .filter(r => r.id && r.produce && !r['#'])
          .map(r => ({
            id: r.id?.trim(),
            produce: r.produce?.trim().toLowerCase(),
            quantityKg: parseFloat(r.quantityKg) || 0,
            arrivalDate: r.arrivalDate?.trim() || new Date().toISOString().slice(0, 10),
            farmerId: r.farmerId?.trim() || 'F_UNKNOWN',
            farmerName: r.farmerName?.trim() || 'Unknown',
            chamberId: r.chamberId?.trim(),
            notes: r.notes?.trim(),
          } as Lot));

        if (parsed.length === 0) {
          msgs.push({ type: 'error', text: 'No valid lots found. Check column names match the template.' });
        } else {
          parsed.forEach(l => addLot(l));
          msgs.push({ type: 'success', text: `✓ Imported ${parsed.length} lots successfully.` });
        }
      }

      setMessages(msgs);
    };

    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: result => parseRows(result.data),
        error: err => setMessages([{ type: 'error', text: `Parse error: ${err.message}` }]),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb   = XLSX.read(e.target!.result, { type: 'binary' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
          parseRows(data);
        } catch (err) {
          setMessages([{ type: 'error', text: `Excel parse error: ${String(err)}` }]);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setMessages([{ type: 'error', text: 'Unsupported file type. Please upload .csv or .xlsx' }]);
    }
  }, [addReadings, addLot]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Demo Data button */}
      <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <FlaskConical size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-200">{T.quick_start_demo}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400">{T.demo_details}</div>
        </div>
        <button
          onClick={loadDemoData}
          className="btn-primary whitespace-nowrap"
        >
          {T.load_demo}
        </button>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV or Excel file by clicking or dragging and dropping"
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 ${
          dragging ? 'border-cold-500 bg-cold-50 dark:bg-cold-950/30' : 'border-gray-300 dark:border-gray-700 hover:border-cold-400'
        }`}
      >
        <Upload size={32} className="text-gray-400 dark:text-gray-500" aria-hidden="true" />
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{T.drop_csv_excel}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{T.supports_csv_xlsx}</div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          aria-label="Choose telemetry or lot CSV or Excel file"
          onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
        />
      </div>

      {/* Messages */}
      {messages.map((m, i) => (
        <div key={i} className={`text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${
          m.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          m.type === 'error'   ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {m.type === 'success' ? (
            <CheckCircle size={16} className="text-green-600 shrink-0" aria-hidden="true" />
          ) : m.type === 'error' ? (
            <AlertTriangle size={16} className="text-red-600 shrink-0" aria-hidden="true" />
          ) : (
            <Info size={16} className="text-blue-600 shrink-0" aria-hidden="true" />
          )}
          <span>{m.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Manual Entry Tab ──────────────────────────────────────────
function ManualTab() {
  const { chambers, addReadings, addLot } = useStore();
  const [tab, setTab] = useState<'reading' | 'lot'>('reading');
  const [saved, setSaved] = useState(false);

  const [rForm, setRForm] = useState({
    chamberId: chambers[0]?.id ?? 'C1',
    timestamp: new Date().toISOString().slice(0, 16),
    tempC: '',
    humidity: '',
    compressorRunHours: '',
    doorOpenCount: '0',
  });

  const [lForm, setLForm] = useState({
    id: '', produce: 'potato', quantityKg: '', arrivalDate: new Date().toISOString().slice(0, 10),
    farmerId: '', farmerName: '', chamberId: chambers[0]?.id ?? 'C1', notes: '',
  });

  const saveReading = () => {
    addReadings([{
      id: `M_${Date.now()}`,
      chamberId: rForm.chamberId,
      timestamp: new Date(rForm.timestamp).toISOString(),
      tempC: parseFloat(rForm.tempC) || 0,
      humidity: parseFloat(rForm.humidity) || 0,
      compressorRunHours: parseFloat(rForm.compressorRunHours) || 0,
      doorOpenCount: parseInt(rForm.doorOpenCount) || 0,
      intervalHours: 1,
    }]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveLot = () => {
    addLot({
      id: lForm.id || `L_${Date.now()}`,
      produce: lForm.produce,
      quantityKg: parseFloat(lForm.quantityKg) || 0,
      arrivalDate: lForm.arrivalDate,
      farmerId: lForm.farmerId,
      farmerName: lForm.farmerName,
      chamberId: lForm.chamberId,
      notes: lForm.notes,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls = 'w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-cold-500';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(['reading', 'lot'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-cold-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            {t === 'reading' ? 'Daily Reading' : 'New Lot Arrival'}
          </button>
        ))}
      </div>

      {tab === 'reading' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Chamber</label>
            <select value={rForm.chamberId} onChange={e => setRForm(f => ({...f, chamberId: e.target.value}))} className={inputCls}>
              {chambers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date & Time</label>
            <input type="datetime-local" value={rForm.timestamp} onChange={e => setRForm(f => ({...f, timestamp: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Temperature (°C)</label>
            <input type="number" step="0.1" placeholder="e.g. 4.2" value={rForm.tempC} onChange={e => setRForm(f => ({...f, tempC: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Humidity (%RH)</label>
            <input type="number" step="0.1" placeholder="e.g. 88" value={rForm.humidity} onChange={e => setRForm(f => ({...f, humidity: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Compressor Run Hours</label>
            <input type="number" step="0.1" min="0" max="1" placeholder="0–1 hrs" value={rForm.compressorRunHours} onChange={e => setRForm(f => ({...f, compressorRunHours: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Door Open Count</label>
            <input type="number" min="0" placeholder="0" value={rForm.doorOpenCount} onChange={e => setRForm(f => ({...f, doorOpenCount: e.target.value}))} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button onClick={saveReading} className="btn-primary w-full py-3 text-base">
              {saved ? '✓ Saved!' : '+ Add Reading'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Lot ID (optional)</label>
            <input placeholder="Auto-generated if empty" value={lForm.id} onChange={e => setLForm(f => ({...f, id: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Produce</label>
            <select value={lForm.produce} onChange={e => setLForm(f => ({...f, produce: e.target.value}))} className={inputCls}>
              {['potato', 'apple', 'onion', 'chilli'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Quantity (kg)</label>
            <input type="number" placeholder="e.g. 1000" value={lForm.quantityKg} onChange={e => setLForm(f => ({...f, quantityKg: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Arrival Date</label>
            <input type="date" value={lForm.arrivalDate} onChange={e => setLForm(f => ({...f, arrivalDate: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Farmer ID</label>
            <input placeholder="e.g. F1" value={lForm.farmerId} onChange={e => setLForm(f => ({...f, farmerId: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Farmer Name</label>
            <input placeholder="e.g. Raju Naidu" value={lForm.farmerName} onChange={e => setLForm(f => ({...f, farmerName: e.target.value}))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Chamber</label>
            <select value={lForm.chamberId} onChange={e => setLForm(f => ({...f, chamberId: e.target.value}))} className={inputCls}>
              {chambers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <input placeholder="Any notes..." value={lForm.notes} onChange={e => setLForm(f => ({...f, notes: e.target.value}))} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button onClick={saveLot} className="btn-primary w-full py-3 text-base">
              {saved ? '✓ Saved!' : '+ Add Lot'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────
function TemplatesTab() {
  const T = useT();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Download these CSV templates, fill them in, and upload them using the Upload tab.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-cold-600 dark:text-cold-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{T.readings_template}</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Daily temperature, humidity, compressor runtime, and door-open data.</p>
          <div className="text-xs text-gray-600 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {READINGS_HEADERS.join(', ')}
          </div>
          <button onClick={() => downloadCSV(READINGS_HEADERS, 'coldtwin_readings_template.csv')}
            className="btn-secondary flex items-center gap-2">
            <Download size={14} /> Download Template
          </button>
        </div>
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-cold-600 dark:text-cold-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{T.lots_template}</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Lot arrivals with produce type, quantity, farmer, and chamber.</p>
          <div className="text-xs text-gray-600 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {LOTS_HEADERS.join(', ')}
          </div>
          <button onClick={() => downloadCSV(LOTS_HEADERS, 'coldtwin_lots_template.csv')}
            className="btn-secondary flex items-center gap-2">
            <Download size={14} /> Download Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function DataInput() {
  const T = useT();
  const [tab, setTab] = useState<Tab>('upload');
  const tabs: { value: Tab; label: string; icon: JSX.Element }[] = [
    { value: 'upload',    label: T.tab_upload, icon: <Upload size={15} /> },
    { value: 'manual',    label: T.tab_manual, icon: <Plus size={15} /> },
    { value: 'templates', label: T.tab_templates,   icon: <Download size={15} /> },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{T.nav_data_input}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload a file, enter readings manually, or download templates.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-0">
        {tabs.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.value
                ? 'border-cold-600 text-cold-700 dark:text-cold-300 font-semibold'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'upload'    && <UploadTab />}
        {tab === 'manual'    && <ManualTab />}
        {tab === 'templates' && <TemplatesTab />}
      </div>
    </div>
  );
}
