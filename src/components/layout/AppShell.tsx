import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Cpu,
  Package2,
  FileText,
  Settings,
  Info,
  Snowflake,
  Sun,
  Moon,
} from 'lucide-react';
import { useT } from '@/i18n';
import { RoleSwitcher } from './RoleSwitcher';
import { DemoBadge } from './DemoBadge';
import { useStore } from '@/store/useStore';
import { WalkthroughModal } from '@/components/walkthrough/WalkthroughModal';

export function AppShell() {
  const T = useT();
  const { settings, theme, toggleTheme } = useStore();
  const storeName = settings.storeName;

  const desktopNavItems = [
    { to: '/dashboard',    icon: <LayoutDashboard size={18} aria-hidden="true" />, label: T.nav_dashboard },
    { to: '/data-input',   icon: <Upload size={18} aria-hidden="true" />,          label: T.nav_data_input },
    { to: '/digital-twin', icon: <Cpu size={18} aria-hidden="true" />,             label: T.nav_digital_twin },
    { to: '/lots',         icon: <Package2 size={18} aria-hidden="true" />,        label: T.nav_lots },
    { to: '/reports',      icon: <FileText size={18} aria-hidden="true" />,        label: T.nav_reports },
    { to: '/settings',     icon: <Settings size={18} aria-hidden="true" />,        label: T.nav_settings },
    { to: '/assumptions',  icon: <Info size={18} aria-hidden="true" />,            label: T.nav_assumptions },
  ];

  // Mobile bottom tab bar items: Dashboard, Data, Twin, Lots, Reports
  const mobileTabs = [
    { to: '/dashboard',    icon: <LayoutDashboard size={20} aria-hidden="true" />, label: 'Dashboard' },
    { to: '/data-input',   icon: <Upload size={20} aria-hidden="true" />,          label: 'Data' },
    { to: '/digital-twin', icon: <Cpu size={20} aria-hidden="true" />,             label: 'Twin' },
    { to: '/lots',         icon: <Package2 size={20} aria-hidden="true" />,        label: 'Lots' },
    { to: '/reports',      icon: <FileText size={20} aria-hidden="true" />,        label: 'Reports' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="bg-cold-700 dark:bg-cold-600 p-1.5 rounded-lg">
          <Snowflake size={18} className="text-white" aria-hidden="true" />
        </div>
        <div>
          <div className="font-bold text-gray-900 dark:text-white text-sm leading-none">ColdTwin</div>
          <div className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">Digital Twin</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav aria-label="Main Navigation" className="flex flex-col gap-1 px-3">
          {desktopNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 dark:focus-visible:ring-cold-400 ${
                  isActive
                    ? 'bg-cold-700 dark:bg-cold-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
        <DemoBadge />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Desktop Sidebar (kept on desktop) */}
      <aside className="hidden lg:flex w-56 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed inset-y-0 left-0 z-30 transition-colors">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20 no-print transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="lg:hidden bg-cold-700 dark:bg-cold-600 p-1.5 rounded-lg text-white shrink-0">
              <Snowflake size={18} aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{storeName}</div>
              <div className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RoleSwitcher />

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="min-w-[44px] min-h-[44px] p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 dark:focus-visible:ring-cold-400"
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-amber-400" aria-hidden="true" />
              ) : (
                <Moon size={20} className="text-gray-600" aria-hidden="true" />
              )}
            </button>

            {/* Quick settings link for mobile header */}
            <NavLink
              to="/settings"
              aria-label="Settings"
              title="Settings"
              className={({ isActive }) =>
                `lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 dark:focus-visible:ring-cold-400 ${
                  isActive
                    ? 'bg-cold-100 dark:bg-cold-950/60 text-cold-800 dark:text-cold-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <Settings size={20} aria-hidden="true" />
            </NavLink>
          </div>
        </header>

        {/* Page content - pb-20 on mobile prevents bottom tab bar overlap */}
        <main className="flex-1 p-4 md:p-6 pb-20 lg:pb-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (replaces hamburger menu on phone screens) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-30 flex items-stretch justify-around px-2 py-1 shadow-lg no-print pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] transition-colors"
      >
        {mobileTabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            aria-label={tab.label}
            className={({ isActive }) =>
              `flex-1 min-h-[48px] min-w-[44px] flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cold-600 dark:focus-visible:ring-cold-400 ${
                isActive
                  ? 'text-cold-700 dark:text-cold-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`
            }
          >
            {tab.icon}
            <span className="text-[11px] leading-none font-medium truncate">{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 3-Step Walkthrough Tour Modal */}
      <WalkthroughModal />
    </div>
  );
}
