import React, { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Ambulance, Building2, HelpCircle, LayoutDashboard, Plus, Siren } from 'lucide-react';
import { UserRole } from '../types';

interface Props {
  setRole: (role: UserRole) => void;
  apiConnected: boolean;
  demoMode: boolean;
  onOpenHowItWorks: () => void;
}

const routes = [
  { path: '/ambulance', label: 'Dispatch dashboard', compact: 'Dashboard', icon: Ambulance, role: 'Ambulance Operator' as UserRole },
  { path: '/ambulance/new-case', label: 'New case', compact: 'New case', icon: Plus, role: 'Ambulance Operator' as UserRole },
  { path: '/hospital', label: 'Hospital desk', compact: 'Hospital', icon: Building2, role: 'Hospital Staff' as UserRole },
  { path: '/admin', label: 'Operations hub', compact: 'Operations', icon: LayoutDashboard, role: 'Administrator' as UserRole }
];

export const Header: React.FC<Props> = ({ setRole, apiConnected, demoMode, onOpenHowItWorks }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/hospital') setRole('Hospital Staff');
    else if (pathname === '/admin') setRole('Administrator');
    else setRole('Ambulance Operator');
  }, [pathname, setRole]);

  const isActive = (path: string) => path === '/ambulance'
    ? pathname === '/ambulance' || (pathname.startsWith('/ambulance/') && pathname !== '/ambulance/new-case')
    : pathname === path;

  const statusText = demoMode ? 'Synthetic demo data · saved on this device' : apiConnected ? 'Database connected' : 'API unavailable';

  const navItems = (mobile = false) => routes.map(({ path, label, compact, icon: Icon, role }) => (
    <NavLink
      key={path}
      to={path}
      aria-current={isActive(path) ? 'page' : undefined}
      onClick={() => setRole(role)}
      className={`header-nav-link ${isActive(path) ? 'active' : ''}`}
      title={label}
    >
      <Icon aria-hidden="true" />
      <span>{mobile ? compact : label}</span>
    </NavLink>
  ));

  return (
    <header className="app-header sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="app-container">
        <div className="header-main-row flex items-center justify-between gap-3 sm:gap-5">
          <Link to="/ambulance" className="header-brand flex items-center gap-3 text-decoration-none group" aria-label="MediRoute dispatch overview">
            <span className="header-brand-mark overflow-hidden p-0.5"><img src="/MediRoute_Logo.png" alt="MediRoute" className="w-full h-full object-contain" /></span>
            <span className="leading-tight">
              <span className="flex items-center gap-2">
                <strong className="header-brand-name">MediRoute</strong>
                <span className="header-brand-tag">108 TN</span>
              </span>
              <span className="header-brand-subtitle">Namakkal · Tiruchengode · Kumarapalayam Network</span>
            </span>
          </Link>

          <nav className="header-route-nav" aria-label="Main navigation">
            {navItems()}
          </nav>

          <div className="header-actions flex items-center gap-2 sm:gap-3">
            <button onClick={onOpenHowItWorks} className="header-help inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer">
              <HelpCircle aria-hidden="true" />
              <span>How it works</span>
            </button>
            <div className={`header-status ${demoMode ? 'demo' : apiConnected ? 'connected' : 'disconnected'}`} role="status" aria-live="polite" aria-label={statusText} title={statusText}>
              <span className="header-status-dot" />
              <span className="header-status-full">{statusText}</span>
              <span className="header-status-short">{demoMode ? 'DEMO' : apiConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>

        <nav className="header-mobile-nav" aria-label="Main navigation">
          {navItems(true)}
        </nav>
      </div>
    </header>
  );
};
