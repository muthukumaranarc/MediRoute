import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Ambulance, 
  MapPin, 
  Search, 
  ArrowLeft, 
  ArrowRight,
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Phone, 
  Fuel, 
  Wind, 
  Battery, 
  Radio, 
  Gauge, 
  Clock, 
  User, 
  HeartPulse, 
  Wrench, 
  Check
} from 'lucide-react';
import { AmbulanceUnit, Case, Hospital } from '../types';
import { FLEET_AMBULANCES } from '../fleetData';

interface Props {
  cases?: Case[];
  hospitals?: Hospital[];
  flash?: (msg: string) => void;
}

// Complete realistic 108 Emergency Ambulance Fleet across Namakkal and Erode
const INITIAL_FLEET: AmbulanceUnit[] = FLEET_AMBULANCES;

export const AmbulanceNetworkView: React.FC<Props> = ({ cases = [], flash }) => {
  const navigate = useNavigate();
  const [fleet, setFleet] = useState<AmbulanceUnit[]>(INITIAL_FLEET);
  const [activeAmbulanceId, setActiveAmbulanceId] = useState<string | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'NAMAKKAL' | 'ERODE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'ACTIVE' | 'MAINTENANCE'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ALS' | 'BLS' | 'NEONATAL'>('ALL');

  // Currently inspected ambulance
  const currentUnit = fleet.find(a => a.id === activeAmbulanceId) || fleet[0];

  // Fleet Statistics
  const totalUnits = fleet.length;
  const activeCount = fleet.filter(a => a.status === 'EN_ROUTE_TO_SCENE' || a.status === 'PATIENT_ON_BOARD' || a.status === 'AT_HOSPITAL').length;
  const availableCount = fleet.filter(a => a.status === 'AVAILABLE_STANDBY').length;
  const alsCount = fleet.filter(a => a.type === 'ALS').length;

  // Filtered List
  const filteredAmbulances = useMemo(() => {
    return fleet.filter(unit => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCall = unit.callSign.toLowerCase().includes(q);
        const matchesReg = unit.vehicleNumber.toLowerCase().includes(q);
        const matchesBase = unit.baseStation.toLowerCase().includes(q);
        const matchesPilot = unit.pilotName.toLowerCase().includes(q);
        const matchesEMT = unit.paramedicName.toLowerCase().includes(q);
        if (!matchesCall && !matchesReg && !matchesBase && !matchesPilot && !matchesEMT) return false;
      }

      // 2. Region
      if (regionFilter !== 'ALL' && unit.region !== regionFilter) return false;

      // 3. Status
      if (statusFilter === 'AVAILABLE' && unit.status !== 'AVAILABLE_STANDBY') return false;
      if (statusFilter === 'ACTIVE' && (unit.status === 'AVAILABLE_STANDBY' || unit.status === 'MAINTENANCE')) return false;
      if (statusFilter === 'MAINTENANCE' && unit.status !== 'MAINTENANCE') return false;

      // 4. Type
      if (typeFilter !== 'ALL' && unit.type !== typeFilter) return false;

      return true;
    });
  }, [fleet, searchQuery, regionFilter, statusFilter, typeFilter]);

  // Status badge helper
  const getStatusBadge = (status: AmbulanceUnit['status']) => {
    switch (status) {
      case 'AVAILABLE_STANDBY':
        return (
          <span className="bg-emerald-50 text-emerald-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Available (Standby)</span>
          </span>
        );
      case 'EN_ROUTE_TO_SCENE':
        return (
          <span className="bg-amber-50 text-amber-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>En Route to Scene</span>
          </span>
        );
      case 'PATIENT_ON_BOARD':
        return (
          <span className="bg-rose-50 text-rose-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Patient on Board</span>
          </span>
        );
      case 'AT_HOSPITAL':
        return (
          <span className="bg-blue-50 text-blue-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-blue-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>At Hospital ER</span>
          </span>
        );
      case 'MAINTENANCE':
      default:
        return (
          <span className="bg-slate-100 text-slate-600 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Maintenance</span>
          </span>
        );
    }
  };

  // Change live status handler
  const handleUpdateStatus = (newStatus: AmbulanceUnit['status']) => {
    if (!currentUnit) return;
    setFleet(prev => prev.map(unit => {
      if (unit.id === currentUnit.id) {
        return { ...unit, status: newStatus };
      }
      return unit;
    }));
    if (flash) flash(`Updated status of ${currentUnit.callSign} to ${newStatus.replace(/_/g, ' ')}`);
  };

  // =========================================================================
  // VIEW 1: FLEET DIRECTORY LIST (Shown by default)
  // =========================================================================
  if (!activeAmbulanceId) {
    return (
      <div className="overview-page-wrapper flex flex-col gap-5 max-w-[1440px] mx-auto pb-12">
        {/* Page Header */}
        <section className="bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/30 border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
                <Ambulance className="w-4 h-4" />
                <span>108 EMERGENCY AMBULANCE NETWORK</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500 font-semibold">Namakkal &amp; Erode Regional Fleet</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                Ambulance Fleet Network
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Live ambulance readiness, telemetry tracking, paramedic crew on duty, and life-support equipment across the corridor.
              </p>
            </div>

            {/* Quick Live Pill */}
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-bold text-xs px-3.5 py-1.5 rounded-full border border-emerald-200/60 shadow-xs flex-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{totalUnits} Ambulances Connected</span>
            </div>
          </div>

          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100">
            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Total Fleet</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{totalUnits} Units</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Across 12 stand depots</div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Available (Standby)</div>
              <div className="text-xl font-black text-[#16a34a] mt-0.5">{availableCount} Units</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Ready for immediate dispatch</div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">On Active Duty</div>
              <div className="text-xl font-black text-amber-600 mt-0.5">{activeCount} Units</div>
              <div className="text-[10px] text-amber-600 font-bold mt-0.5">En route or at ER scene</div>
            </div>

            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Advanced Life Support (ALS)</div>
              <div className="text-xl font-black text-blue-600 mt-0.5">{alsCount} Units</div>
              <div className="text-[10px] text-blue-600 font-bold mt-0.5">Ventilator &amp; Defib equipped</div>
            </div>
          </div>
        </section>

        {/* Search & Filter Controls */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3.5">
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search call sign, vehicle reg, crew, or base..."
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
            {/* Region Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRegionFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  regionFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Regions
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter('NAMAKKAL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  regionFilter === 'NAMAKKAL' ? 'bg-[#16a34a] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Namakkal
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter('ERODE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  regionFilter === 'ERODE' ? 'bg-[#0284c7] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
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
                onClick={() => setStatusFilter('AVAILABLE')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'AVAILABLE' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standby
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ACTIVE' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                On Duty
              </button>
            </div>
          </div>
        </section>

        {/* Ambulance Fleet Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAmbulances.map((unit) => (
            <div 
              key={unit.id}
              onClick={() => setActiveAmbulanceId(unit.id)}
              className="bg-white border border-slate-200/90 hover:border-emerald-500/60 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                      <Ambulance className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                        <span>{unit.callSign}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          unit.type === 'ALS' ? 'bg-emerald-100 text-emerald-800' :
                          unit.type === 'BLS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {unit.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {unit.vehicleNumber}
                      </div>
                    </div>
                  </div>

                  {getStatusBadge(unit.status)}
                </div>

                {/* Base Station & Model */}
                <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 flex-none" />
                    <span className="truncate">{unit.baseStation}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-400 pl-5">
                    {unit.model}
                  </div>
                </div>

                {/* Telemetry Gauge Strip */}
                <div className="grid grid-cols-3 gap-2 my-3 py-2 border-y border-slate-100 text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                      <Fuel className="w-3 h-3 text-amber-500" />
                      <span>Fuel</span>
                    </div>
                    <div className="text-xs font-extrabold text-slate-800 mt-0.5">
                      {unit.fuelLevelPercent}%
                    </div>
                  </div>

                  <div className="flex flex-col items-center border-x border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                      <Wind className="w-3 h-3 text-blue-500" />
                      <span>Oxygen</span>
                    </div>
                    <div className="text-xs font-extrabold text-slate-800 mt-0.5">
                      {unit.oxygenTankPercent}%
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                      <Battery className="w-3 h-3 text-emerald-500" />
                      <span>Battery</span>
                    </div>
                    <div className="text-xs font-extrabold text-slate-800 mt-0.5">
                      {unit.batteryPercent}%
                    </div>
                  </div>
                </div>

                {/* Crew */}
                <div className="text-xs text-slate-600 space-y-1 mb-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Lead Paramedic:</span>
                    <span className="font-bold text-slate-800">{unit.paramedicName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Pilot Driver:</span>
                    <span className="font-bold text-slate-800">{unit.pilotName}</span>
                  </div>
                </div>

                {/* Active Case Tag if assigned */}
                {unit.assignedCaseNumber && (
                  <div className="bg-rose-50 border border-rose-200/70 rounded-xl p-2 mb-2 flex items-center justify-between text-xs">
                    <span className="text-rose-700 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Assigned to {unit.assignedCaseNumber}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-rose-500">{unit.lastTriageAt}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#16a34a] group-hover:text-[#15803d]">
                <span>View Telemetry &amp; Details</span>
                <div className="w-6 h-6 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </section>

        {filteredAmbulances.length === 0 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
            <Ambulance className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No matching ambulances found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query or reset your region and status filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRegionFilter('ALL');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
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
  // VIEW 2: SPECIFIC AMBULANCE TELEMETRY & DETAILS (When user clicks an ambulance)
  // =========================================================================
  return (
    <div className="overview-page-wrapper flex flex-col gap-5 max-w-[1440px] mx-auto pb-12">
      {/* 1. Back Navigation & Ambulance Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveAmbulanceId(null)}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#16a34a] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition-all hover:border-[#16a34a]/40 cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-[#16a34a] transition-colors" />
          <span>Back to All Ambulances</span>
        </button>

        {/* Switcher Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="amb-switch" className="text-xs font-semibold text-slate-500 flex-none">
            Viewing Unit:
          </label>
          <select
            id="amb-switch"
            value={currentUnit.id}
            onChange={(e) => setActiveAmbulanceId(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {fleet.map(u => (
              <option key={u.id} value={u.id}>
                {u.callSign} · {u.baseStation}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Unit Hero Banner */}
      <section className="bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/30 border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
              <Ambulance className="w-4 h-4" />
              <span>108 RAPID RESPONSE UNIT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500 font-semibold">{currentUnit.region} DISTRICT FLEET</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentUnit.callSign}
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-md">
                {currentUnit.type} · {currentUnit.model}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-2">
              <span className="font-bold text-slate-700">Reg: {currentUnit.vehicleNumber}</span>
              <span>·</span>
              <MapPin className="w-3.5 h-3.5 text-rose-500 flex-none" />
              <span>Base: {currentUnit.baseStation}</span>
            </p>
          </div>

          {/* Live Status Badge */}
          <div className="flex items-center gap-2.5 flex-none">
            {getStatusBadge(currentUnit.status)}
          </div>
        </div>

        {/* Live Status Switcher Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 mr-1">Update Live Status:</span>
          <button
            type="button"
            onClick={() => handleUpdateStatus('AVAILABLE_STANDBY')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentUnit.status === 'AVAILABLE_STANDBY' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Standby (Available)
          </button>
          <button
            type="button"
            onClick={() => handleUpdateStatus('EN_ROUTE_TO_SCENE')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentUnit.status === 'EN_ROUTE_TO_SCENE' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            En Route to Scene
          </button>
          <button
            type="button"
            onClick={() => handleUpdateStatus('PATIENT_ON_BOARD')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentUnit.status === 'PATIENT_ON_BOARD' 
                ? 'bg-rose-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Patient on Board
          </button>
          <button
            type="button"
            onClick={() => handleUpdateStatus('AT_HOSPITAL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentUnit.status === 'AT_HOSPITAL' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            At Hospital ER
          </button>
          <button
            type="button"
            onClick={() => handleUpdateStatus('MAINTENANCE')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentUnit.status === 'MAINTENANCE' 
                ? 'bg-slate-700 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Maintenance
          </button>
        </div>
      </section>

      {/* 3. Telemetry Stat Strip (4 Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fuel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-amber-500" />
              <span>Fuel Tank</span>
            </span>
            <span className="font-bold text-slate-800">{currentUnit.fuelLevelPercent}%</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {Math.round((currentUnit.fuelLevelPercent / 100) * 70)} Liters
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full ${currentUnit.fuelLevelPercent < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
              style={{ width: `${currentUnit.fuelLevelPercent}%` }}
            />
          </div>
        </div>

        {/* Oxygen */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-blue-500" />
              <span>Medical Oxygen</span>
            </span>
            <span className="font-bold text-slate-800">{currentUnit.oxygenTankPercent}%</span>
          </div>
          <div className="text-xl font-black text-blue-600 mt-0.5">
            {Math.round((currentUnit.oxygenTankPercent / 100) * 2000)} Liters
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-blue-500" 
              style={{ width: `${currentUnit.oxygenTankPercent}%` }}
            />
          </div>
        </div>

        {/* Battery */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Battery className="w-4 h-4 text-emerald-500" />
              <span>Vehicle Inverter</span>
            </span>
            <span className="font-bold text-slate-800">{currentUnit.batteryPercent}%</span>
          </div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">
            13.8 V Optimal
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald-500" 
              style={{ width: `${currentUnit.batteryPercent}%` }}
            />
          </div>
        </div>

        {/* GPS Coordinates */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#16a34a]" />
              <span>Telemetry Transceiver</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">GPS 4G</span>
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {currentUnit.latitude.toFixed(4)}° N, {currentUnit.longitude.toFixed(4)}° E
          </div>
          <div className="text-[10.5px] text-slate-400 mt-1">
            Live satellite link active · 5s ping
          </div>
        </div>
      </section>

      {/* 4. Split Detail Layout: Active Mission / Crew & Medical Inventory */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left Column: Active Emergency Mission & Crew */}
        <div className="space-y-4">
          {/* Active Mission Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-bold text-slate-900">Active Emergency Mission</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Dispatch ID</span>
            </div>

            {currentUnit.assignedCaseNumber ? (
              <div className="bg-rose-50/40 border border-rose-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm text-slate-900">{currentUnit.assignedCaseNumber}</span>
                  <span className="bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                    ACTIVE CALLOUT
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div><strong>Pickup Station:</strong> Central Tiruchengode emergency location</div>
                  <div><strong>Target Facility:</strong> Vivekanandha Medical Care Hospital</div>
                  <div><strong>Dispatch Time:</strong> {currentUnit.lastTriageAt}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between">
                  <Link
                    to="/ambulance/cases"
                    className="text-xs font-bold text-[#16a34a] hover:text-[#15803d] flex items-center gap-1"
                  >
                    <span>View Case File</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to="/ambulance/map"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Track on Map</span>
                    <MapPin className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-800">Unit is on Standby</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Standing by at {currentUnit.baseStation}. Ready for nearest 108 dispatch.
                </p>
              </div>
            )}
          </div>

          {/* Shift Crew on Duty Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Shift Crew on Duty</h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active Shift
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Paramedic */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-slate-900">{currentUnit.paramedicName}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Lead EMT Paramedic (Advanced Life Support)</div>
                </div>
                <a 
                  href={`tel:${currentUnit.paramedicPhone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call EMT</span>
                </a>
              </div>

              {/* Pilot Driver */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-slate-900">{currentUnit.pilotName}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Emergency Vehicle Pilot (Heavy Driver)</div>
                </div>
                <a 
                  href={`tel:${currentUnit.pilotPhone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Pilot</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Onboard Medical Equipment & Diagnostics */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
              <h2 className="text-sm font-bold text-slate-900">Onboard Equipment &amp; Diagnostics</h2>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {currentUnit.equipment.length} Items Certified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentUnit.equipment.map(item => (
              <div 
                key={item}
                className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#16a34a] flex items-center justify-center flex-none">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {item.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-[9.5px] font-bold text-emerald-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  READY
                </span>
              </div>
            ))}
          </div>

          {/* Vehicle Certification & Service Data */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-400" />
              <span>Vehicle Certification &amp; Readiness</span>
            </h3>
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">RTO Fitness Certificate:</span>
                <span className="font-bold text-slate-800">Valid until March 2028</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Sanitation &amp; Disinfection:</span>
                <span className="font-bold text-emerald-600">Today at 06:30 AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Radio Dispatch Channel:</span>
                <span className="font-bold text-slate-800">108-Zone-3 (Namakkal/Erode)</span>
              </div>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
};
