import React, { useState, useEffect, useMemo } from 'react';
import { Hospital, CoordinationRequest, Case } from '../types';
import { api, DEMO_MODE } from '../api';
import { 
  Building2, 
  Bell, 
  Check, 
  X, 
  CheckCircle2, 
  Save, 
  Plus, 
  Minus, 
  BedDouble, 
  Activity, 
  Clock3, 
  ArrowLeft, 
  Search, 
  MapPin, 
  ChevronRight, 
  ShieldCheck, 
  AlertTriangle,
  CircleHelp,
  Stethoscope,
  Radio
} from 'lucide-react';

interface Props {
  hospitals: Hospital[];
  selectedHospitalId: string;
  setSelectedHospitalId: (id: string) => void;
  refresh: () => void;
  flash: (msg: string) => void;
}

const ALL_SERVICES = ['CARDIAC', 'TRAUMA', 'STROKE', 'RESPIRATORY', 'GENERAL_EMERGENCY'];
const ALL_EQUIPMENT = ['DEFIBRILLATOR', 'ECG', 'OXYGEN', 'VENTILATOR', 'CT'];

export const HospitalDeskView: React.FC<Props> = ({ 
  hospitals, 
  selectedHospitalId, 
  setSelectedHospitalId, 
  refresh, 
  flash 
}) => {
  // Navigation state: null = Show Directory list; string = Show specific hospital details
  const [activeHospitalId, setActiveHospitalId] = useState<string | null>(null);

  // Search and filter state for the directory
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState<'ALL' | 'NAMAKKAL' | 'ERODE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACCEPTING' | 'LIMITED'>('ALL');

  // Specific hospital management state (when activeHospitalId is selected)
  const currentHospital = hospitals.find(h => h.id === (activeHospitalId || selectedHospitalId)) || hospitals[0];
  const [incomingRequests, setIncomingRequests] = useState<CoordinationRequest[]>([]);
  const [beds, setBeds] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [intakeEnabled, setIntakeEnabled] = useState(true);
  const [services, setServices] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Synchronize state when selected hospital changes
  useEffect(() => {
    if (currentHospital) {
      setBeds(currentHospital.availableEmergencyBeds || 0);
      setIsOpen(currentHospital.operationalStatus === 'OPEN');
      setIntakeEnabled(currentHospital.emergencyIntakeEnabled);
      setServices(currentHospital.services || []);
      setEquipment(currentHospital.equipment || []);
      loadRequests(currentHospital.id);
    }
  }, [currentHospital?.id, currentHospital?.lastUpdatedAt]);

  const loadRequests = async (hospId: string) => {
    if (!hospId) return;
    try {
      const reqs = await api.getHospitalRequests(hospId);
      setIncomingRequests(reqs);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Periodic request refresh when viewing hospital details
  useEffect(() => {
    if (!activeHospitalId) return;
    const timer = setInterval(() => {
      if (!document.hidden && activeHospitalId) {
        loadRequests(activeHospitalId);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [activeHospitalId]);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  const handleSaveAvailability = async () => {
    if (!currentHospital) return;
    setIsSaving(true);
    try {
      await api.updateAvailability(currentHospital.id, {
        operationalStatus: isOpen ? 'OPEN' : 'CLOSED',
        emergencyIntakeEnabled: intakeEnabled,
        availableEmergencyBeds: Math.max(0, beds),
        services,
        equipment
      });
      await refresh();
      flash(`Saved availability for ${currentHospital.name}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDecision = async (request: CoordinationRequest, action: 'ACCEPT' | 'REJECT') => {
    try {
      await api.decideRequest(request.id, action);
      if (currentHospital) await loadRequests(currentHospital.id);
      await refresh();
      flash(action === 'ACCEPT' ? 'Admission accepted. One bed reserved.' : 'Request declined.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Directory Filter Calculations
  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => {
      // 1. Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = h.name.toLowerCase().includes(query);
        const matchesAddr = h.address.toLowerCase().includes(query);
        const matchesServices = h.services.some(s => s.toLowerCase().includes(query));
        if (!matchesName && !matchesAddr && !matchesServices) return false;
      }

      // 2. District filter
      const isErode = h.address.toLowerCase().includes('erode') || 
                      h.address.toLowerCase().includes('perundurai') ||
                      h.address.toLowerCase().includes('bhavani') ||
                      h.address.toLowerCase().includes('gobi') ||
                      h.id.includes('erode');
      if (districtFilter === 'NAMAKKAL' && isErode) return false;
      if (districtFilter === 'ERODE' && !isErode) return false;

      // 3. Status filter
      const isLimited = h.intakeStatus === 'Limited capacity' || (h.availableEmergencyBeds && h.availableEmergencyBeds < 5);
      if (statusFilter === 'ACCEPTING' && isLimited) return false;
      if (statusFilter === 'LIMITED' && !isLimited) return false;

      return true;
    });
  }, [hospitals, searchQuery, districtFilter, statusFilter]);

  // Overall Directory Statistics
  const totalAvailableBeds = hospitals.reduce((sum, h) => sum + (h.availableEmergencyBeds || 0), 0);
  const openCount = hospitals.filter(h => h.operationalStatus === 'OPEN' && h.emergencyIntakeEnabled).length;
  const limitedCount = hospitals.filter(h => h.intakeStatus === 'Limited capacity' || (h.availableEmergencyBeds || 0) < 5).length;

  // =========================================================================
  // VIEW 1: HOSPITAL DIRECTORY LIST (Shown by default on the page)
  // =========================================================================
  if (!activeHospitalId) {
    return (
      <div className="overview-page-wrapper flex flex-col gap-5 max-w-[1440px] mx-auto pb-12">
        {/* Page Header */}
        <section className="bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/30 border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
                <Building2 className="w-4 h-4" />
                <span>REGIONAL HOSPITAL NETWORK</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500 font-semibold">Namakkal &amp; Erode Corridor</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                Hospital Network Directory
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Real-time bed availability, emergency intake readiness, and capacity status across all regional hospitals.
              </p>
            </div>

            {/* Quick Live Pill */}
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-bold text-xs px-3.5 py-1.5 rounded-full border border-emerald-200/60 shadow-xs flex-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{hospitals.length} Hospitals Online</span>
            </div>
          </div>

          {/* 4 Quick Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100">
            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Total Hospitals</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{hospitals.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Across 2 districts</div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Available ER Beds</div>
              <div className="text-xl font-black text-[#16a34a] mt-0.5">{totalAvailableBeds}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Ready for admission</div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Accepting Emergencies</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{openCount}</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Active triage intake</div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Limited Capacity</div>
              <div className="text-xl font-black text-amber-600 mt-0.5">{limitedCount}</div>
              <div className="text-[10px] text-amber-600 font-bold mt-0.5">&lt; 5 beds available</div>
            </div>
          </div>
        </section>

        {/* Search & Filter Controls */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3.5">
          {/* Search input */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hospital name, town, or specialty..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* District Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDistrictFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  districtFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Regions ({hospitals.length})
              </button>
              <button
                type="button"
                onClick={() => setDistrictFilter('NAMAKKAL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  districtFilter === 'NAMAKKAL' ? 'bg-[#16a34a] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Namakkal
              </button>
              <button
                type="button"
                onClick={() => setDistrictFilter('ERODE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  districtFilter === 'ERODE' ? 'bg-[#0284c7] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Erode
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACCEPTING')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ACCEPTING' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ready
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LIMITED')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'LIMITED' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Limited
              </button>
            </div>
          </div>
        </section>

        {/* Hospital Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHospitals.map((h) => {
            const isLimited = h.intakeStatus === 'Limited capacity' || (h.availableEmergencyBeds && h.availableEmergencyBeds < 5);
            const isPaused = h.operationalStatus !== 'OPEN' || !h.emergencyIntakeEnabled;
            
            return (
              <div 
                key={h.id}
                onClick={() => {
                  setSelectedHospitalId(h.id);
                  setActiveHospitalId(h.id);
                }}
                className="bg-white border border-slate-200/90 hover:border-emerald-500/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Top status bar */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        {h.address.toLowerCase().includes('erode') ? 'Erode Region' : 'Namakkal Region'}
                      </span>
                    </div>

                    {/* Status badge */}
                    {isPaused ? (
                      <span className="bg-slate-100 text-slate-600 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Intake Paused</span>
                      </span>
                    ) : isLimited ? (
                      <span className="bg-amber-50 text-amber-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Limited Capacity</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Accepting</span>
                      </span>
                    )}
                  </div>

                  {/* Hospital Name */}
                  <h3 className="font-extrabold text-slate-900 text-[15px] leading-snug group-hover:text-[#16a34a] transition-colors mb-1">
                    {h.name}
                  </h3>

                  {/* Address */}
                  <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-none mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{h.address}</span>
                  </div>

                  {/* Bed Capacity Indicator */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                        <BedDouble className="w-4 h-4 text-emerald-600" />
                        <span>Available ER Beds</span>
                      </div>
                      <div className="font-black text-slate-900">
                        <span className="text-base text-emerald-600">{h.availableEmergencyBeds}</span>
                        <span className="text-slate-400 font-medium"> / {h.totalEmergencyBeds || 20}</span>
                      </div>
                    </div>
                    {/* Visual Progress bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLimited ? 'bg-amber-500' : 'bg-[#16a34a]'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.round(((h.availableEmergencyBeds || 0) / (h.totalEmergencyBeds || 20)) * 100))}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Services Tags */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {h.services.slice(0, 4).map((s) => (
                      <span 
                        key={s} 
                        className="text-[9.5px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                      >
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                    {h.services.length > 4 && (
                      <span className="text-[9.5px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">
                        +{h.services.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#16a34a] group-hover:text-[#15803d]">
                  <span>View Details &amp; Control Desk</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {filteredHospitals.length === 0 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No matching hospitals found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query or reset your district and capacity filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDistrictFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="mt-4 px-4 py-2 bg-[#16a34a] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: SPECIFIC HOSPITAL DETAILS & CONTROL DESK (When user clicks a hospital)
  // =========================================================================
  const pending = incomingRequests.filter(r => r.status === 'PENDING');
  const history = incomingRequests.filter(r => r.status !== 'PENDING');

  return (
    <div className="overview-page-wrapper flex flex-col gap-5 max-w-[1440px] mx-auto pb-12">
      {/* 1. Back Navigation & Facility Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveHospitalId(null)}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#16a34a] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition-all hover:border-[#16a34a]/40 cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-[#16a34a] transition-colors" />
          <span>Back to All Hospitals</span>
        </button>

        {/* Quick Hospital Switcher Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="hosp-switch" className="text-xs font-semibold text-slate-500 flex-none">
            Viewing Facility:
          </label>
          <select
            id="hosp-switch"
            value={currentHospital.id}
            onChange={(e) => {
              setSelectedHospitalId(e.target.value);
              setActiveHospitalId(e.target.value);
            }}
            className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Hospital Hero Banner */}
      <section className="bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/30 border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
              <Building2 className="w-4 h-4" />
              <span>HOSPITAL CONTROL DESK</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500 font-semibold">{currentHospital.id.includes('erode') ? 'Erode Region' : 'Namakkal Region'}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {currentHospital.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-none" />
              <span>{currentHospital.address}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-none">
            <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs ${
              isOpen && intakeEnabled 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                : 'bg-amber-50 text-amber-700 border border-amber-200/80'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOpen && intakeEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isOpen && intakeEnabled ? 'Ready for arrivals' : 'Intake paused'}</span>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Desk Stats (3 cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-none">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500">Awaiting Decision</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{pending.length}</div>
            <div className="text-[10px] text-slate-400">Requires triage review</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-none">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500">Available ER Beds</div>
            <div className="text-2xl font-black text-[#16a34a] mt-0.5">{beds}</div>
            <div className="text-[10px] text-slate-400">Current live capacity</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500">Emergency Services</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {services.length} <span className="text-xs font-medium text-slate-400">/ {ALL_SERVICES.length}</span>
            </div>
            <div className="text-[10px] text-slate-400">Active medical capabilities</div>
          </div>
        </div>
      </section>

      {/* 4. Split Desk Layout: Incoming Ambulance Requests & Capacity Management */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        
        {/* Left Column: Incoming Ambulance Transfers */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-bold text-slate-900">Incoming Ambulance Transfers</h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                {DEMO_MODE ? 'LOCAL DEMO' : 'LIVE QUEUE'}
              </span>
            </div>

            {pending.length ? (
              <div className="flex flex-col gap-3">
                {pending.map(req => (
                  <IncomingRequestCard 
                    key={req.id} 
                    request={req} 
                    onAccept={() => handleDecision(req, 'ACCEPT')} 
                    onReject={() => handleDecision(req, 'REJECT')}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#16a34a] flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">All caught up</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  No ambulance transfers currently waiting for your response. New emergency requests will appear here automatically.
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400 mt-4">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Queue checks automatically every 5 seconds</span>
                </div>
              </div>
            )}

            {/* Decision History */}
            {history.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <h3 className="font-bold text-slate-800">Recent Decisions</h3>
                  <span className="text-slate-400 font-semibold">{history.length} Total</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {history.slice(0, 5).map(req => (
                    <div key={req.id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">Case #{req.caseId.slice(0, 8)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <Clock3 className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {req.status === 'ACCEPTED' ? 'Accepted' : 'Declined'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Availability & Capacity Management */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#16a34a]" />
                <h2 className="text-sm font-bold text-slate-900">Availability &amp; Capacity Controls</h2>
              </div>
              <span className="text-slate-400 cursor-pointer" title="Changes take effect immediately across the dispatch network when saved">
                <CircleHelp className="w-4 h-4" />
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Operating status toggles */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Hospital Operating Status</div>
                    <div className="text-[11px] text-slate-500">Facility is open and medical staff on duty</div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isOpen ? 'bg-[#16a34a] text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isOpen ? 'OPEN' : 'CLOSED'}
                  </button>
                </div>

                <div className="border-t border-slate-200/70 pt-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Emergency Intake Status</div>
                    <div className="text-[11px] text-slate-500">Accepting new 108 ambulance arrivals</div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIntakeEnabled(!intakeEnabled)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      intakeEnabled ? 'bg-[#16a34a] text-white shadow-xs' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {intakeEnabled ? 'ACCEPTING' : 'PAUSED'}
                  </button>
                </div>
              </div>

              {/* Bed Stepper */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Available Emergency Beds</div>
                  <div className="text-[11px] text-slate-500">Adjust the count ready for incoming patients</div>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                  <button 
                    type="button" 
                    onClick={() => setBeds(v => Math.max(0, v - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Decrease beds"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-lg font-black text-slate-900 w-10 text-center">
                    {beds}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setBeds(v => v + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Increase beds"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Emergency Services */}
              <div>
                <CapabilityGroup 
                  title="Emergency Specialties" 
                  items={ALL_SERVICES} 
                  selected={services} 
                  onToggle={s => toggle(services, setServices, s)}
                />
              </div>

              {/* Equipment */}
              <div>
                <CapabilityGroup 
                  title="Critical Equipment &amp; Diagnostics" 
                  items={ALL_EQUIPMENT} 
                  selected={equipment} 
                  onToggle={e => toggle(equipment, setEquipment, e)}
                />
              </div>
            </div>
          </div>

          {/* Save Action Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              {DEMO_MODE ? 'Saved to local browser state.' : 'Updates publish instantly across the 108 network.'}
            </span>
            <button 
              type="button"
              disabled={isSaving}
              onClick={handleSaveAvailability}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving changes...' : 'Save Availability'}</span>
            </button>
          </div>
        </div>

      </section>
    </div>
  );
};

const CapabilityGroup: React.FC<{
  title: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}> = ({ title, items, selected, onToggle }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-slate-800">{title}</span>
      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
        {selected.length} Active
      </span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => {
        const isChecked = selected.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              isChecked 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {isChecked ? (
              <Check className="w-3 h-3 text-[#16a34a]" />
            ) : (
              <span className="w-2.5 h-2.5 rounded border border-slate-300 inline-block" />
            )}
            <span>{item.replace(/_/g, ' ')}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const IncomingRequestCard: React.FC<{
  request: CoordinationRequest;
  onAccept: () => void;
  onReject: () => void;
}> = ({ request, onAccept, onReject }) => {
  const [caseDetails, setCaseDetails] = useState<Case | null>(null);

  useEffect(() => {
    api.getCaseById(request.caseId)
      .then(setCaseDetails)
      .catch(() => {});
  }, [request.caseId]);

  return (
    <article className="border border-rose-100 bg-rose-50/30 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ef4444] text-white font-extrabold text-[11px] flex items-center justify-center shadow-xs">
            108
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900">
              {caseDetails?.caseNumber || 'Incoming Emergency'}
              <span className="text-rose-600 ml-1">· {caseDetails?.conditionCategory || 'URGENT'}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Requested {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {request.distanceKm.toFixed(1)} km away
            </div>
          </div>
        </div>

        <span className="bg-rose-100 text-rose-700 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Needs Response
        </span>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg p-2.5 text-[11px] flex flex-col gap-1 text-slate-600">
        <div><strong className="text-slate-800 mr-1.5">Pickup:</strong>{caseDetails?.displayAddress || 'Emergency pickup'}</div>
        <div><strong className="text-slate-800 mr-1.5">Equipment:</strong>{caseDetails?.requiredEquipment.join(', ') || 'Standard equipment'}</div>
        {caseDetails?.notes && (
          <div><strong className="text-slate-800 mr-1.5">Notes:</strong>{caseDetails.notes}</div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Accept &amp; Reserve Bed</span>
        </button>

        <button
          type="button"
          onClick={onReject}
          className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
        >
          Decline
        </button>
      </div>
    </article>
  );
};
