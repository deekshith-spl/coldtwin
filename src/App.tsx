import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { I18nContext, strings } from '@/i18n';
import { useStore } from '@/store/useStore';
import Dashboard from '@/pages/Dashboard';
import DataInput from '@/pages/DataInput';
import DigitalTwin from '@/pages/DigitalTwin';
import Lots from '@/pages/Lots';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Assumptions from '@/pages/Assumptions';

export default function App() {
  const language = useStore(s => s.settings.language);
  const t = strings[language];

  return (
    <I18nContext.Provider value={t}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="data-input"   element={<DataInput />} />
            <Route path="digital-twin" element={<DigitalTwin />} />
            <Route path="lots"         element={<Lots />} />
            <Route path="reports"      element={<Reports />} />
            <Route path="settings"     element={<Settings />} />
            <Route path="assumptions"  element={<Assumptions />} />
            <Route path="*"            element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nContext.Provider>
  );
}
