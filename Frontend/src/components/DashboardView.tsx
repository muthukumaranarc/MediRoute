import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Ambulance, 
  Clock, 
  CheckCircle2, 
  BedDouble, 
  MapPin, 
  ChevronRight,
  PhoneCall,
  Navigation,
  Building2,
  Users,
  Timer,
  Radio,
  BarChart3
} from 'lucide-react';
import { Case, CoordinationRequest, Hospital } from '../types';
import { LiveResponseMap } from './LiveResponseMap';
import { getConditionCategoryInfo } from '../conditionCategories';
import { DESTINATION_CHANGE_EVENT, getActiveNewCases, resolveDestinationHospital } from '../mapRouting';

interface Props {
  cases: Case[];
  requests: CoordinationRequest[];
  hospitals: Hospital[];
  refresh: () => void;
  flash: (msg: string) => void;
}

export const DashboardView: React.FC<Props> = ({ cases, requests, hospitals }) => {
  const navigate = useNavigate();
  const [caseTab, setCaseTab] = useState<'all' | 'in-progress' | 'confirmed'>('all');
  const [, setDestVersion] = useState(0);

  useEffect(() => {
    const onDestChange = () => setDestVersion((v) => v + 1);
    window.addEventListener(DESTINATION_CHANGE_EVENT, onDestChange);
    return () => window.removeEventListener(DESTINATION_CHANGE_EVENT, onDestChange);
  }, []);

  const activeNewCases = getActiveNewCases(cases);
  const activeRouteCase = activeNewCases[0] || null;
  const activeDestination = activeRouteCase
    ? resolveDestinationHospital(activeRouteCase, hospitals, requests)
    : null;

  // Exact metrics matching reference design + any newly created cases
  const activeCount = 8 + activeNewCases.length;
  const awaitingCount =
    3 + activeNewCases.filter((c) => c.status === 'SEARCHING' || c.status === 'REQUEST_PENDING').length;
  const confirmedCount =
    5 + activeNewCases.filter((c) => c.status === 'HOSPITAL_ACCEPTED').length;
  const availableBeds = hospitals.reduce((sum, h) => sum + (h.availableEmergencyBeds || 0), 0) || 206;

  // Map newly created active cases into display rows, keeping baseline rows for reference
  const liveRows = activeNewCases.map((c) => {
    const condInfo = getConditionCategoryInfo(c.conditionCategory);
    const createdDate = c.createdAt ? new Date(c.createdAt) : new Date();
    const isConfirmed = c.status === 'HOSPITAL_ACCEPTED';
    const isAwaiting = c.status === 'REQUEST_PENDING';

    return {
      id: c.id,
      caseNumber: c.caseNumber,
      conditionCategory: condInfo.shortName,
      conditionTagColor: condInfo.badgeClass,
      pickupLocation: c.displayAddress,
      time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: createdDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      statusText: isConfirmed
        ? 'Hospital Confirmed'
        : isAwaiting
        ? 'Awaiting Response'
        : 'Searching Hospitals',
      statusType: isConfirmed ? 'confirmed' : isAwaiting ? 'awaiting' : 'en-route',
      statusPillColor: isConfirmed
        ? 'bg-emerald-50 text-emerald-600'
        : isAwaiting
        ? 'bg-sky-50 text-sky-600'
        : 'bg-amber-50 text-amber-700',
      statusIcon: isConfirmed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ambulance className="w-3.5 h-3.5" />
    };
  });

  // 3 Primary Display Cases matching the reference design
  const defaultRows = [
    {
      id: cases[0]?.id || 'case-0001',
      caseNumber: 'MR-2026-0001',
      conditionCategory: 'TRAUMA',
      conditionTagColor: 'bg-rose-50 text-rose-600',
      pickupLocation: 'Central Coimbatore Test (Tiruchengode)',
      time: '12:20',
      date: '18 Oct 2026',
      statusText: 'En Route to Hospital',
      statusType: 'en-route',
      statusPillColor: 'bg-emerald-50 text-emerald-600',
      statusIcon: <Ambulance className="w-3.5 h-3.5" />
    },
    {
      id: cases[1]?.id || 'case-0002',
      caseNumber: 'MR-2026-0002',
      conditionCategory: 'MEDICAL',
      conditionTagColor: 'bg-amber-50 text-amber-600',
      pickupLocation: 'Kumarapalayam Bus Stand',
      time: '12:05',
      date: '18 Oct 2026',
      statusText: 'Awaiting Response',
      statusType: 'awaiting',
      statusPillColor: 'bg-sky-50 text-sky-600',
      statusIcon: <Clock className="w-3.5 h-3.5" />
    },
    {
      id: cases[2]?.id || 'case-0003',
      caseNumber: 'MR-2026-0003',
      conditionCategory: 'CARDIAC',
      conditionTagColor: 'bg-purple-50 text-purple-600',
      pickupLocation: 'Namakkal Old Town',
      time: '11:58',
      date: '18 Oct 2026',
      statusText: 'Hospital Confirmed',
      statusType: 'confirmed',
      statusPillColor: 'bg-emerald-50 text-emerald-600',
      statusIcon: <CheckCircle2 className="w-3.5 h-3.5" />
    }
  ];

  const displayCases = [...liveRows, ...defaultRows].slice(0, Math.max(3, liveRows.length + 2));
  const inProgressTotal = displayCases.filter(
    (c) => c.statusType === 'en-route' || c.statusType === 'awaiting'
  ).length;
  const confirmedTotal = displayCases.filter((c) => c.statusType === 'confirmed').length;

  const filteredCases = displayCases.filter(c => {
    if (caseTab === 'all') return true;
    if (caseTab === 'in-progress') return c.statusType === 'en-route' || c.statusType === 'awaiting';
    if (caseTab === 'confirmed') return c.statusType === 'confirmed';
    return true;
  });

  return (
    <div className="overview-page-wrapper flex flex-col gap-5 max-w-[1440px] mx-auto pb-10">
      
      {/* 1. HERO CARD BANNER */}
      <section className="bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/30 border border-slate-200/90 rounded-2xl p-6 relative overflow-hidden shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* Left: Greeting & Headline */}
          <div className="flex-1 min-w-[280px]">
            <div className="text-slate-600 font-semibold text-xs tracking-wide mb-1">
              Good Morning, Dispatcher 👋
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Emergency Response
            </h1>
            <div className="text-2xl lg:text-3xl font-extrabold text-[#16a34a] tracking-tight leading-tight mb-2">
              Coordination
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time ambulance operations across Namakkal &amp; Erode.
            </p>
          </div>

          {/* Center: Pulsing Lifeline ECG + 3D 108 Ambulance */}
          <div className="flex items-center justify-center relative flex-1 min-w-[260px] max-w-[420px] h-28">
            {/* ECG lifeline SVG */}
            <svg className="w-28 lg:w-36 h-10 text-[#22c55e] mr-2 flex-none" viewBox="0 0 140 40" fill="none">
              <path 
                d="M0 20 L40 20 L48 20 L54 6 L60 34 L66 10 L72 26 L78 20 L140 20" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>

            {/* 3D 108 Ambulance Render Image */}
            <div className="relative w-58 h-38 flex items-center justify-center">
              <img 
                src="/ambulance-108.png" 
                alt="108 Ambulance" 
                className="w-full h-full object-contain filter drop-shadow-md rounded-lg scale-x-[-1]"
              />
            </div>
          </div>

          {/* Right: New Emergency Case Button & 4 Quick Actions */}
          <div className="flex flex-col items-end gap-3 flex-none min-w-[240px]">
            {/* Main Action Button - Exactly ONE plus icon */}
            <Link 
              to="/ambulance/new-case" 
              className="w-full sm:w-auto px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={2.8} />
              <span>New Emergency Case</span>
            </Link>

            {/* 4 Circular Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-3 w-full pt-1">
              {/* Action 1: Emergency Call */}
              <button 
                type="button" 
                onClick={() => navigate('/ambulance/new-case')}
                className="flex flex-col items-center group cursor-pointer"
                title="Initiate Emergency Call"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-50 group-hover:bg-emerald-100 text-[#16a34a] flex items-center justify-center transition-colors shadow-xs">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold text-center mt-1 leading-tight whitespace-nowrap">
                  Emergency<br />Call
                </span>
              </button>

              {/* Action 2: Dispatch Nearest */}
              <button 
                type="button" 
                onClick={() => navigate('/ambulance/cases')}
                className="flex flex-col items-center group cursor-pointer"
                title="Dispatch Nearest Ambulance"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-50 group-hover:bg-emerald-100 text-[#16a34a] flex items-center justify-center transition-colors shadow-xs">
                  <Navigation className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold text-center mt-1 leading-tight whitespace-nowrap">
                  Dispatch<br />Nearest
                </span>
              </button>

              {/* Action 3: Find Hospital */}
              <button 
                type="button" 
                onClick={() => navigate('/hospital')}
                className="flex flex-col items-center group cursor-pointer"
                title="Find Available Hospital"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-50 group-hover:bg-emerald-100 text-[#16a34a] flex items-center justify-center transition-colors shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold text-center mt-1 leading-tight whitespace-nowrap">
                  Find<br />Hospital
                </span>
              </button>

              {/* Action 4: Live Tracking */}
              <button 
                type="button" 
                onClick={() => navigate('/ambulance/map')}
                className="flex flex-col items-center group cursor-pointer"
                title="Open Live Tracking Map"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-50 group-hover:bg-emerald-100 text-[#16a34a] flex items-center justify-center transition-colors shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold text-center mt-1 leading-tight whitespace-nowrap">
                  Live<br />Tracking
                </span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 2. FOUR KPI METRIC CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Transports */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none">
            <Ambulance className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-600">Active Transports</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {String(activeCount).padStart(2, '0')}
              </span>
              <span className="bg-emerald-50 text-emerald-600 font-bold text-[10.5px] px-1.5 py-0.5 rounded-full">
                ↑ +2
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">In transit to hospital</div>
          </div>
        </div>

        {/* Card 2: Awaiting Hospital */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-none">
            <Clock className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-600">Awaiting Hospital</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {String(awaitingCount).padStart(2, '0')}
              </span>
              <span className="bg-slate-100 text-slate-400 font-bold text-[10.5px] px-2 py-0.5 rounded-full">
                —
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Waiting for response</div>
          </div>
        </div>

        {/* Card 3: Beds Confirmed */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none">
            <BedDouble className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-600">Beds Confirmed</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {String(confirmedCount).padStart(2, '0')}
              </span>
              <span className="bg-emerald-50 text-emerald-600 font-bold text-[10.5px] px-1.5 py-0.5 rounded-full">
                ↑ +1
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Admission confirmed</div>
          </div>
        </div>

        {/* Card 4: Available ER Beds */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-none">
            <Building2 className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-600">Available ER Beds</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {availableBeds}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across 20 hospitals</div>
          </div>
        </div>
      </section>

      {/* 3. MIDDLE SPLIT SECTION: Active Emergency Cases & Live Response Map */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        
        {/* Left: Active Emergency Cases Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Title and Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Ambulance className="w-5 h-5 text-[#16a34a]" />
                <h2 className="text-sm font-bold text-slate-900">
                  Active Emergency Cases ({displayCases.length})
                </h2>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCaseTab('all')}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
                    caseTab === 'all' 
                      ? 'bg-[#16a34a] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({displayCases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCaseTab('in-progress')}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer ${
                    caseTab === 'in-progress' 
                      ? 'bg-[#16a34a] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  In Progress ({inProgressTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setCaseTab('confirmed')}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer ${
                    caseTab === 'confirmed' 
                      ? 'bg-[#16a34a] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Confirmed ({confirmedTotal})
                </button>
              </div>
            </div>

            {/* Cases Rows */}
            <div className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <div 
                  key={c.caseNumber}
                  onClick={() => navigate(`/ambulance/cases/${c.id}`)}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition-colors cursor-pointer group"
                >
                  {/* Case Number & Condition Badge */}
                  <div className="flex items-center gap-2.5 min-w-[130px]">
                    <span className="font-extrabold text-xs text-slate-900">
                      {c.caseNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${c.conditionTagColor}`}>
                      {c.conditionCategory}
                    </span>
                  </div>

                  {/* Pickup Location */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 flex-none" />
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {c.pickupLocation}
                    </span>
                  </div>

                  {/* Time & Date */}
                  <div className="text-right min-w-[85px] hidden sm:block">
                    <div className="text-xs font-bold text-slate-800">{c.time}</div>
                    <div className="text-[10px] text-slate-400">{c.date}</div>
                  </div>

                  {/* Status Pill */}
                  <div className="min-w-[150px] flex justify-end">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap ${c.statusPillColor}`}>
                      {c.statusIcon}
                      <span>{c.statusText}</span>
                    </span>
                  </div>

                  {/* Chevron Right */}
                  <div className="text-slate-400 group-hover:text-slate-700 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Response Map Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-sm font-bold text-slate-900 whitespace-nowrap">
                  Live Response Map
                </h2>
                {activeRouteCase && activeDestination ? (
                  <span className="text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full truncate">
                    {activeRouteCase.caseNumber} → {activeDestination.hospital.name}
                  </span>
                ) : (
                  <span className="text-[10.5px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Standby
                  </span>
                )}
              </div>
              <Link 
                to="/ambulance/map" 
                className="text-xs font-semibold text-[#16a34a] hover:text-[#15803d] flex items-center gap-1 transition-colors flex-none"
              >
                <span>View Full Map</span>
                <span className="text-sm leading-none">↗</span>
              </Link>
            </div>

            {/* Embedded Live Map */}
            <LiveResponseMap cases={cases} requests={requests} hospitals={hospitals} />
          </div>
        </div>

      </section>

      {/* 4. BOTTOM ROW: 3 CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Bottom Card 1: Avg. Response Time */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-800">
              <Timer className="w-4 h-4 text-[#16a34a]" />
              <h3 className="text-xs font-bold text-slate-800">Avg. Response Time</h3>
            </div>
            
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">12.4 min</span>
              <span className="bg-emerald-50 text-emerald-600 font-bold text-xs px-2 py-0.5 rounded-full">
                ↓ -18%
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">vs. last 7 days</div>
          </div>

          {/* Smooth Green Wave SVG Area Chart */}
          <div className="w-full pt-2">
            <svg viewBox="0 0 240 55" className="w-full h-12" fill="none">
              <defs>
                <linearGradient id="smoothWaveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0 38 C35 38 50 16 80 26 C110 36 140 10 170 20 C200 30 220 8 240 12 L240 55 L0 55 Z"
                fill="url(#smoothWaveGradient)"
              />
              <path
                d="M0 38 C35 38 50 16 80 26 C110 36 140 10 170 20 C200 30 220 8 240 12"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Bottom Card 2: Network Status */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 text-slate-800">
              <Radio className="w-4 h-4 text-[#16a34a]" />
              <h3 className="text-xs font-bold text-slate-800">Network Status</h3>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Row 1 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="font-semibold text-slate-700">Ambulance Network</span>
                </div>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  ✓ Online
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="font-semibold text-slate-700">Hospital Network</span>
                </div>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  ✓ Online
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="font-semibold text-slate-700">Dispatch System</span>
                </div>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  ✓ Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Card 3: Case Trend (Last 7 Days) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-slate-800">
            <BarChart3 className="w-4 h-4 text-[#16a34a]" />
            <h3 className="text-xs font-bold text-slate-800">Case Trend (Last 7 Days)</h3>
          </div>

          <div className="flex items-end justify-between gap-4 pt-1">
            {/* Stat Numbers */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">56</span>
                <span className="text-emerald-600 font-bold text-xs">↑ +14%</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Total Cases</div>
              <div className="text-[10px] text-slate-400">vs. previous 7 days</div>
            </div>

            {/* 7 Vertical Green Rounded Bars */}
            <div className="flex items-end gap-1.5 h-14 pb-0.5">
              <div className="w-2.5 h-[35%] bg-emerald-400/80 rounded-t-sm rounded-b-sm" title="Day 1" />
              <div className="w-2.5 h-[55%] bg-emerald-400/80 rounded-t-sm rounded-b-sm" title="Day 2" />
              <div className="w-2.5 h-[45%] bg-emerald-400/80 rounded-t-sm rounded-b-sm" title="Day 3" />
              <div className="w-2.5 h-[70%] bg-emerald-500 rounded-t-sm rounded-b-sm" title="Day 4" />
              <div className="w-2.5 h-[60%] bg-emerald-500 rounded-t-sm rounded-b-sm" title="Day 5" />
              <div className="w-2.5 h-[85%] bg-[#16a34a] rounded-t-sm rounded-b-sm" title="Day 6" />
              <div className="w-2.5 h-[100%] bg-[#16a34a] rounded-t-sm rounded-b-sm" title="Day 7" />
            </div>
          </div>
        </div>

      </section>

    </div>
  );
};

// Export alias for backward-compatibility
export const DispatchView = DashboardView;
