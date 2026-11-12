import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  House, 
  Ambulance, 
  Building2, 
  MapPin, 
  BarChart2 
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const isDashboard = path === '/' || path === '/ambulance';
  const isCases = path === '/ambulance/cases' || path.startsWith('/ambulance/cases/');
  const isHospital = path === '/hospital';
  const isLiveMap = path === '/ambulance/map';
  const isReports = path === '/admin';

  return (
    <nav 
      className="fixed bottom-3 inset-x-3 z-50 md:hidden max-w-md mx-auto bg-[#043324] border border-emerald-600/30 rounded-full px-2 py-1.5 shadow-[0_10px_35px_rgba(2,44,34,0.45)] flex items-center justify-around"
      aria-label="Mobile Navigation"
    >
      {/* 1. Dashboard */}
      <Link
        to="/ambulance"
        className={`flex flex-col items-center justify-center transition-all active:scale-95 ${
          isDashboard 
            ? 'bg-[#16a34a] text-white font-bold rounded-full px-4 py-1.5 shadow-sm' 
            : 'text-emerald-100/75 hover:text-white font-medium px-2 py-1'
        }`}
      >
        <House className="w-4 h-4" />
        <span className="text-[10px] tracking-tight mt-0.5">Dashboard</span>
      </Link>

      {/* 2. Cases */}
      <Link
        to="/ambulance/cases"
        className={`flex flex-col items-center justify-center transition-all active:scale-95 ${
          isCases 
            ? 'bg-[#16a34a] text-white font-bold rounded-full px-4 py-1.5 shadow-sm' 
            : 'text-emerald-100/75 hover:text-white font-medium px-2 py-1'
        }`}
      >
        <Ambulance className="w-4 h-4" />
        <span className="text-[10px] tracking-tight mt-0.5">Cases</span>
      </Link>

      {/* 3. Hospital Network */}
      <Link
        to="/hospital"
        className={`flex flex-col items-center justify-center transition-all active:scale-95 ${
          isHospital 
            ? 'bg-[#16a34a] text-white font-bold rounded-full px-4 py-1.5 shadow-sm' 
            : 'text-emerald-100/75 hover:text-white font-medium px-2 py-1'
        }`}
      >
        <Building2 className="w-4 h-4" />
        <span className="text-[10px] tracking-tight mt-0.5">Network</span>
      </Link>

      {/* 4. Live Map */}
      <Link
        to="/ambulance/map"
        className={`flex flex-col items-center justify-center transition-all active:scale-95 ${
          isLiveMap 
            ? 'bg-[#16a34a] text-white font-bold rounded-full px-4 py-1.5 shadow-sm' 
            : 'text-emerald-100/75 hover:text-white font-medium px-2 py-1'
        }`}
      >
        <MapPin className="w-4 h-4" />
        <span className="text-[10px] tracking-tight mt-0.5">Map</span>
      </Link>

      {/* 5. Reports */}
      <Link
        to="/admin"
        className={`flex flex-col items-center justify-center transition-all active:scale-95 ${
          isReports 
            ? 'bg-[#16a34a] text-white font-bold rounded-full px-4 py-1.5 shadow-sm' 
            : 'text-emerald-100/75 hover:text-white font-medium px-2 py-1'
        }`}
      >
        <BarChart2 className="w-4 h-4" />
        <span className="text-[10px] tracking-tight mt-0.5">Reports</span>
      </Link>
    </nav>
  );
};
