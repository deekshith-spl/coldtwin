import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Cpu, Package2,
  FileText, Settings, Info, Menu, X, Snowflake,
} from 'lucide-react';
import { useT } from '@/i18n';
import { RoleSwitcher } from './RoleSwitcher';
import { DemoBadge } from './DemoBadge';
import { useStore } from '@/store/useStore';

export function AppShell() {
  const T = useT();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const storeName = useStore(s => s.settings.storeName);

  const navItems = [
    { to: '/dashboard',    icon: <LayoutDashboard size={18} />, label: T.nav_dashboard },
    { to: '/data-input',   icon: <Upload size={18} />,          label: T.nav_data_input },
    { to: '/digital-twin', icon: <Cpu size={18} />,             label: T.nav_digital_twin },
    { to: '/lots',         icon: <Package2 size={18} />,        label: T.nav_lots },
    { to: '/reports',      icon: <FileText size={18} />,        label: T.nav_reports },
    { to: '/settings',     icon: <Settings size={18} />,        label: T.nav_settings },
    { to: '/assumptions',  icon: <Info size={18} />,            label: T.nav_assumptions },
  ];

  const NavItems = () => (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-cold-700 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <div className="bg-cold-700 p-1.5 rounded-lg">
          <Snowflake size={18} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm leading-none">ColdTwin</div>
          <div className="text-xs text-gray-400 mt-0.5">Digital Twin</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4">
        <NavItems />
      </div>

      {/* Bottom */}
      <div className="px-5 py-4 border-t border-gray-100">
        <DemoBadge />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-white h-full shadow-xl z-50">
            <button
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="text-sm font-semibold text-gray-900 leading-none">{storeName}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </div>
            </div>
          </div>
          <RoleSwitcher />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
