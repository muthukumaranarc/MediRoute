import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  House, 
  Activity, 
  Briefcase, 
  Crosshair, 
  Building2, 
  Ambulance, 
  BarChart3, 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  Settings,
  Network
} from 'lucide-react';

interface SidebarProps {
  onOpenHowItWorks?: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenHowItWorks, onOpenSettings }) => {
  const location = useLocation();
  const path = location.pathname;

  const [isOperationsOpen, setIsOperationsOpen] = useState(true);
  const [isNetworkOpen, setIsNetworkOpen] = useState(true);

  const isDashboard = path === '/' || path === '/ambulance';
  const isCases = path === '/ambulance/cases' || path.startsWith('/ambulance/cases/') || path === '/ambulance/new-case';
  const isLiveMap = path === '/ambulance/map';
  const isHospital = path === '/hospital';
  const isAmbulanceNetwork = path === '/ambulance/network';
  const isReports = path === '/admin';

  return (
    <aside className="mediroute-sidebar hidden md:flex relative flex-col justify-between select-none" aria-label="Main Navigation">
      {/* Top Section: Brand & Navigation */}
      <div>
        {/* Brand Header */}
        <Link to="/ambulance" className="sidebar-brand-container">
          <div className="sidebar-logo-icon overflow-hidden p-0.5 bg-white border border-slate-200 shadow-xs">
            <img 
              src="/MediRoute_Logo.png" 
              alt="MediRoute 108" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-title">
              MediRoute <span className="text-[#16a34a]">108</span>
            </div>
            <div className="sidebar-subtitle">
              Emergency Care Network
            </div>
          </div>
        </Link>

        {/* Main Navigation Menu */}
        <nav className="sidebar-nav">
          {/* Dashboard */}
          <Link 
            to="/ambulance" 
            className={`sidebar-nav-item ${isDashboard ? 'active' : ''}`}
          >
            <House className="w-4 h-4 flex-none" />
            <span>Dashboard</span>
          </Link>

          {/* Operations Dropdown */}
          <div>
            <button
              type="button"
              onClick={() => setIsOperationsOpen(prev => !prev)}
              className="sidebar-nav-item w-full justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-slate-500 flex-none" />
                <span>Operations</span>
              </div>
              {isOperationsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {isOperationsOpen && (
              <div className="sidebar-sub-nav">
                <Link 
                  to="/ambulance/cases" 
                  className={`sidebar-sub-item ${isCases && !isLiveMap ? 'active' : ''}`}
                >
                  <Briefcase className="w-3.5 h-3.5 flex-none" />
                  <span>Ambulance Cases</span>
                </Link>

                <Link 
                  to="/ambulance/map" 
                  className={`sidebar-sub-item ${isLiveMap ? 'active' : ''}`}
                >
                  <Crosshair className="w-3.5 h-3.5 flex-none" />
                  <span>Live Tracking</span>
                </Link>
              </div>
            )}
          </div>

          {/* Network Dropdown */}
          <div>
            <button
              type="button"
              onClick={() => setIsNetworkOpen(prev => !prev)}
              className="sidebar-nav-item w-full justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Network className="w-4 h-4 text-slate-500 flex-none" />
                <span>Network</span>
              </div>
              {isNetworkOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {isNetworkOpen && (
              <div className="sidebar-sub-nav">
                <Link 
                  to="/hospital" 
                  className={`sidebar-sub-item ${isHospital ? 'active' : ''}`}
                >
                  <Building2 className="w-3.5 h-3.5 flex-none" />
                  <span>Hospital Network</span>
                </Link>

                <Link 
                  to="/ambulance/network" 
                  className={`sidebar-sub-item ${isAmbulanceNetwork ? 'active' : ''}`}
                >
                  <Ambulance className="w-3.5 h-3.5 flex-none" />
                  <span>Ambulance Network</span>
                </Link>
              </div>
            )}
          </div>

          {/* Reports & Analytics */}
          <Link 
            to="/admin" 
            className={`sidebar-nav-item ${isReports ? 'active' : ''}`}
          >
            <BarChart3 className="w-4 h-4 text-slate-500 flex-none" />
            <span>Reports &amp; Analytics</span>
          </Link>
        </nav>
      </div>

      {/* Bottom Area */}
      <div className="sidebar-bottom-area">
        {/* Regional Network Card */}
        <div className="sidebar-region-card">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[12px] text-slate-800 leading-tight">Namakkal &amp; Erode</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-600 font-semibold">Regional Network</span>
            </div>
          </div>
        </div>

        {/* User Profile Bar */}
        <div className="sidebar-profile-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="sidebar-avatar">
              D
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-bold text-slate-900 text-[12.5px] truncate">Dispatcher</div>
              <div className="text-[10.5px] text-slate-400 font-medium truncate">Regional Control</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={onOpenSettings || onOpenHowItWorks}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer flex-none"
            title="Dispatcher settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
