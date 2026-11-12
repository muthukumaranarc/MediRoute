import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  MapPin, 
  Clock3, 
  Ambulance, 
  CheckCircle2, 
  ArrowRight, 
  MoreVertical,
  Filter,
  AlertCircle,
  RotateCw,
  Crosshair,
  Building2,
  ShieldCheck,
  User,
  Activity,
  Fuel,
  Wind
} from 'lucide-react';
import { Case, CoordinationRequest, Hospital } from '../types';
import { FLEET_AMBULANCES, getAmbulanceStateBadge } from '../fleetData';
import { CONDITION_CATEGORIES, getConditionCategoryInfo } from '../conditionCategories';
import { isLiveNewCase } from '../mapRouting';

interface CasesListViewProps {
  cases: Case[];
  requests: CoordinationRequest[];
  hospitals: Hospital[];
  refresh: () => void;
  flash: (msg: string) => void;
}

export const CasesListView: React.FC<CasesListViewProps> = ({ cases, refresh }) => {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<'all' | 'transit' | 'needs-response' | 'confirmed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'NAMAKKAL' | 'ERODE'>('ALL');

  // Fleet Statistics
  const totalFleetCount = FLEET_AMBULANCES.length;
  const standbyFleetCount = FLEET_AMBULANCES.filter(a => a.status === 'AVAILABLE_STANDBY').length;
  const activeFleetCount = FLEET_AMBULANCES.filter(a => a.status === 'EN_ROUTE_TO_SCENE' || a.status === 'PATIENT_ON_BOARD' || a.status === 'AT_HOSPITAL').length;

  // Filter cases by tab, search query, condition, and region
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Tab filter
      if (filterTab === 'transit') {
        const isTransit = c.assignedAmbulanceState === 'EN_ROUTE_TO_SCENE' || 
                          c.assignedAmbulanceState === 'PATIENT_ON_BOARD' ||
                          c.status === 'REQUEST_PENDING';
        if (!isTransit) return false;
      } else if (filterTab === 'needs-response') {
        if (c.status !== 'REQUEST_PENDING' && c.caseNumber !== 'MR-2026-0109') return false;
      } else if (filterTab === 'confirmed') {
        if (c.status !== 'HOSPITAL_ACCEPTED' && c.caseNumber !== 'MR-2026-0110') return false;
      }

      // 2. Condition category filter
      if (conditionFilter !== 'ALL' && c.conditionCategory !== conditionFilter) {
        return false;
      }

      // 3. Region filter
      if (regionFilter === 'NAMAKKAL') {
        const isNamakkal = (c.displayAddress || '').toLowerCase().includes('namakkal') ||
                           (c.displayAddress || '').toLowerCase().includes('tiruchengode') ||
                           (c.displayAddress || '').toLowerCase().includes('kumarapalayam') ||
                           (c.displayAddress || '').toLowerCase().includes('mohanur') ||
                           (c.displayAddress || '').toLowerCase().includes('rasipuram') ||
                           (c.displayAddress || '').toLowerCase().includes('velur');
        if (!isNamakkal) return false;
      } else if (regionFilter === 'ERODE') {
        const isErode = (c.displayAddress || '').toLowerCase().includes('erode') ||
                        (c.displayAddress || '').toLowerCase().includes('perundurai') ||
                        (c.displayAddress || '').toLowerCase().includes('bhavani') ||
                        (c.displayAddress || '').toLowerCase().includes('gobi') ||
                        (c.displayAddress || '').toLowerCase().includes('sathya') ||
                        (c.displayAddress || '').toLowerCase().includes('thindal');
        if (!isErode) return false;
      }

      // 4. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = c.caseNumber.toLowerCase().includes(q);
        const matchAddr = (c.displayAddress || '').toLowerCase().includes(q);
        const matchCond = c.conditionCategory.toLowerCase().includes(q);
        const matchAmb = (c.assignedAmbulanceCallSign || '').toLowerCase().includes(q);
        const matchHosp = (c.targetHospitalName || '').toLowerCase().includes(q);
        if (!matchNum && !matchAddr && !matchCond && !matchAmb && !matchHosp) return false;
      }

      return true;
    });
  }, [cases, filterTab, searchQuery, conditionFilter, regionFilter]);

  // Counts for tabs
  const transitCount = cases.filter(c => 
    c.assignedAmbulanceState === 'EN_ROUTE_TO_SCENE' || 
    c.assignedAmbulanceState === 'PATIENT_ON_BOARD' || 
    c.status === 'REQUEST_PENDING'
  ).length;

  const needsResponseCount = cases.filter(c => 
    c.status === 'REQUEST_PENDING' || c.caseNumber === 'MR-2026-0109'
  ).length;

  const confirmedCount = cases.filter(c => 
    c.status === 'HOSPITAL_ACCEPTED' || c.caseNumber === 'MR-2026-0110'
  ).length;

  return (
    <div className="overview-page-wrapper">
      {/* Page Header */}
      <div className="overview-header-row flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-1">
        <div>
          <h1 className="overview-title text-xl sm:text-2xl">Ambulance Cases &amp; Triage</h1>
          <p className="overview-subtitle text-xs sm:text-sm">
            Live 108 emergency responses, ambulance telemetry states, and real-time hospital bed coordination.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/ambulance/map" className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all">
            <Crosshair className="w-3.5 h-3.5 text-[#16a34a]" />
            <span>Live Response Map</span>
          </Link>
          <Link to="/ambulance/new-case" className="btn-new-case text-xs py-2 px-3.5 active:scale-95">
            <Plus className="w-4 h-4" />
            <span>New Emergency Case</span>
          </Link>
        </div>
      </div>

      {/* Fleet Telemetry State Strip */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Active Cases */}
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Active Network Cases</span>
              <Activity className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">{cases.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across Namakkal &amp; Erode</div>
          </div>

          {/* Ambulances in Transit */}
          <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700">Ambulances in Transit</span>
              <Ambulance className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-700 mt-1">{transitCount}</div>
            <div className="text-[10px] text-amber-600/80 mt-0.5">En Route or Patient on Board</div>
          </div>

          {/* Standby Available Fleet */}
          <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700">Available Standby</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-[#16a34a] mt-1">{standbyFleetCount} / {totalFleetCount}</div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">Ready for instant dispatch</div>
          </div>

          {/* Hospital Bed Admissions */}
          <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-700">Admissions Confirmed</span>
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-blue-700 mt-1">{confirmedCount}</div>
            <div className="text-[10px] text-blue-600/80 mt-0.5">ER Beds reserved by hospitals</div>
          </div>
        </div>
      </section>

      {/* Main Cases Container Card */}
      <section className="dashboard-card">
        {/* Controls Bar: Search & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by case ID, ambulance (TN-108), location, hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Filters Bar: Region, Condition, Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Region Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Districts</option>
                <option value="NAMAKKAL">Namakkal Region</option>
                <option value="ERODE">Erode Region</option>
              </select>
            </div>

            {/* Condition Category Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value="ALL">All conditions</option>
                {CONDITION_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs-group">
              <button
                type="button"
                className={`filter-tab-pill ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All cases ({cases.length})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${filterTab === 'transit' ? 'active' : ''}`}
                onClick={() => setFilterTab('transit')}
              >
                In transit ({transitCount})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${filterTab === 'needs-response' ? 'active' : ''}`}
                onClick={() => setFilterTab('needs-response')}
              >
                Needs response ({needsResponseCount})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${filterTab === 'confirmed' ? 'active' : ''}`}
                onClick={() => setFilterTab('confirmed')}
              >
                Confirmed ({confirmedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Cases Data Table for Desktop (lg and up) */}
        <div className="table-clean-container hidden lg:block overflow-x-auto">
          <table className="cases-data-table w-full">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Case ID</th>
                <th style={{ width: '105px' }}>Condition</th>
                <th style={{ width: '220px' }}>Pickup Location</th>
                <th style={{ width: '230px' }}>Ambulance &amp; State</th>
                <th style={{ width: '210px' }}>Hospital ER Target</th>
                <th style={{ width: '110px' }}>Time</th>
                <th style={{ width: '130px' }} className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length > 0 ? (
                filteredCases.map((c) => {
                  const condInfo = getConditionCategoryInfo(c.conditionCategory);

                  // Ambulance call sign & state
                  const ambCallSign = c.assignedAmbulanceCallSign || 'TN-108-NK-01';
                  const ambState = c.assignedAmbulanceState || (
                    c.status === 'HOSPITAL_ACCEPTED' ? 'AT_HOSPITAL' :
                    c.status === 'REQUEST_PENDING' ? 'PATIENT_ON_BOARD' : 'EN_ROUTE_TO_SCENE'
                  );
                  const stateBadge = getAmbulanceStateBadge(ambState);

                  // Find assigned ambulance telemetry
                  const matchedAmb = FLEET_AMBULANCES.find(a => a.callSign === ambCallSign);

                  // Hospital Status badge
                  let hospitalStatusBadge = (
                    <span className="status-badge-blue text-[11px]">
                      <RotateCw className="w-3 h-3 flex-none" />
                      <span>Matching Hospitals</span>
                    </span>
                  );
                  if (c.status === 'COMPLETED' || c.status === 'CLOSED' || c.status === 'CANCELLED') {
                    hospitalStatusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3 h-3 flex-none" />
                        <span>Completed</span>
                      </span>
                    );
                  } else if (c.caseNumber === 'MR-2026-0109' || c.status === 'REQUEST_PENDING') {
                    hospitalStatusBadge = (
                      <span className="status-badge-amber text-[11px]">
                        <Clock3 className="w-3 h-3 flex-none" />
                        <span>Awaiting ER Response</span>
                      </span>
                    );
                  } else if (c.caseNumber === 'MR-2026-0110' || c.status === 'HOSPITAL_ACCEPTED') {
                    hospitalStatusBadge = (
                      <span className="status-badge-green text-[11px]">
                        <CheckCircle2 className="w-3 h-3 flex-none" />
                        <span>Admission Confirmed</span>
                      </span>
                    );
                  }

                  let displayTime = '12:20 PM';
                  let displayDate = '18 Oct 2026';
                  if (c.createdAt) {
                    displayTime = new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    displayDate = new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  }

                  const targetHosp = c.targetHospitalName || 'Recommended Hospital Match';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Case ID */}
                      <td className="case-id-cell">
                        <span className="font-extrabold text-slate-900 tracking-tight">{c.caseNumber}</span>
                      </td>

                      {/* Condition */}
                      <td>
                        <span className={`inline-block text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${condInfo.badgeClass}`}>
                          {condInfo.shortName}
                        </span>
                      </td>

                      {/* Pickup location */}
                      <td>
                        <div className="pickup-info-cell">
                          <MapPin className="w-3.5 h-3.5 text-red-500 flex-none mt-0.5" />
                          <div>
                            <div className="pickup-title font-bold text-slate-800 text-[12px] leading-tight">
                              {c.displayAddress}
                            </div>
                            <div className="pickup-city text-[10.5px] text-slate-400 mt-0.5">
                              <span>
                                {c.displayAddress.includes('Namakkal') ? 'Namakkal District' :
                                 c.displayAddress.includes('Erode') ? 'Erode District' :
                                 c.displayAddress.includes('Bhavani') ? 'Bhavani, Erode' :
                                 c.displayAddress.includes('Kumarapalayam') ? 'Kumarapalayam, Namakkal' :
                                 c.displayAddress.includes('Perundurai') ? 'Perundurai, Erode' :
                                 c.displayAddress.includes('Gobi') ? 'Gobichettipalayam, Erode' : 'Tiruchengode, Namakkal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ambulance & State */}
                      <td>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 bg-slate-900 text-white font-extrabold text-[10.5px] px-2 py-0.5 rounded-md shadow-xs">
                              <Ambulance className="w-3 h-3 text-red-400" />
                              <span>{ambCallSign}</span>
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${stateBadge.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stateBadge.dotColor} animate-pulse`} />
                              <span>{stateBadge.label}</span>
                            </span>
                          </div>
                          
                          {/* Subline: Paramedic & Telemetry summary */}
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5">
                            <span className="font-medium text-slate-700">
                              {c.paramedicName || matchedAmb?.paramedicName || 'EMT Crew Onboard'}
                            </span>
                            {c.etaMinutes !== undefined && (
                              <span className="text-amber-700 font-extrabold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                                ETA ~{c.etaMinutes}m
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Hospital ER Target & Status */}
                      <td>
                        <div className="flex flex-col gap-1">
                          <div className="text-[11.5px] font-bold text-slate-800 leading-tight">
                            {targetHosp}
                          </div>
                          <div>{hospitalStatusBadge}</div>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="time-cell">
                        <div className="time-val text-xs font-bold text-slate-800">{displayTime}</div>
                        <div className="date-val text-[10px] text-slate-400">{displayDate}</div>
                      </td>

                      {/* Action */}
                      <td className="action-cell text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link 
                            to={isLiveNewCase(c) ? `/ambulance/map?caseId=${c.id}` : '/ambulance/map'}
                            title="Track live on map"
                            className="p-1.5 text-slate-500 hover:text-[#16a34a] hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                          </Link>
                          <Link to={`/ambulance/cases/${c.id}`} className="btn-view-case text-xs px-2.5 py-1">
                            <span>View</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No emergency cases match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Card View (< lg) */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filteredCases.length > 0 ? (
            filteredCases.map((c) => {
              const condInfo = getConditionCategoryInfo(c.conditionCategory);
              const conditionBadge = (
                <span className={`font-bold text-[10px] px-2.5 py-0.5 rounded-full border ${condInfo.badgeClass}`}>
                  {condInfo.shortName}
                </span>
              );

              // Ambulance call sign & state
              const ambCallSign = c.assignedAmbulanceCallSign || 'TN-108-NK-01';
              const ambState = c.assignedAmbulanceState || (
                c.status === 'HOSPITAL_ACCEPTED' ? 'AT_HOSPITAL' :
                c.status === 'REQUEST_PENDING' ? 'PATIENT_ON_BOARD' : 'EN_ROUTE_TO_SCENE'
              );
              const stateBadge = getAmbulanceStateBadge(ambState);

              let statusBadge = (
                <span className="bg-[#e0f2fe] text-[#0284c7] font-semibold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <RotateCw className="w-3 h-3 flex-none" />
                  <span>Matching Hospitals</span>
                </span>
              );
              if (c.status === 'COMPLETED' || c.status === 'CLOSED' || c.status === 'CANCELLED') {
                statusBadge = (
                  <span className="bg-slate-100 text-slate-600 font-semibold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 flex-none" />
                    <span>Completed</span>
                  </span>
                );
              } else if (c.caseNumber === 'MR-2026-0109' || c.status === 'REQUEST_PENDING') {
                statusBadge = (
                  <span className="bg-[#fef3c7] text-[#d97706] font-semibold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <Clock3 className="w-3 h-3 flex-none" />
                    <span>Awaiting ER Response</span>
                  </span>
                );
              } else if (c.caseNumber === 'MR-2026-0110' || c.status === 'HOSPITAL_ACCEPTED') {
                statusBadge = (
                  <span className="bg-[#dcfce7] text-[#16a34a] font-semibold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 flex-none" />
                    <span>Admission Confirmed</span>
                  </span>
                );
              }

              let displayTime = '12:20 PM';
              if (c.createdAt) {
                displayTime = new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
              }

              return (
                <div
                  key={c.id}
                  className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col gap-2.5"
                >
                  {/* Row 1: Case Number, Condition Badge, Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[14px] text-slate-900 tracking-tight">
                        {c.caseNumber}
                      </span>
                      {conditionBadge}
                    </div>
                    <span className="text-[12px] text-slate-400 font-medium">
                      {displayTime}
                    </span>
                  </div>

                  {/* Row 2: Location with Red Pin */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-500 flex-none mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-bold text-[13px] text-slate-900 leading-snug">
                        {c.displayAddress}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Assigned Ambulance & State Strip */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-slate-900 text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow-xs">
                        <Ambulance className="w-3 h-3 text-red-400" />
                        <span>{ambCallSign}</span>
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${stateBadge.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stateBadge.dotColor} animate-pulse`} />
                        <span>{stateBadge.label}</span>
                      </span>
                    </div>
                    {c.etaMinutes !== undefined && (
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
                        ETA ~{c.etaMinutes}m
                      </span>
                    )}
                  </div>

                  {/* Row 4: Hospital ER Target & Status */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 flex-none" />
                      <span className="font-semibold text-slate-700 truncate">{c.targetHospitalName || 'Vivekanandha Hospital'}</span>
                    </div>
                    <div className="flex-none">{statusBadge}</div>
                  </div>

                  {/* Row 5: Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <Link
                      to={isLiveNewCase(c) ? `/ambulance/map?caseId=${c.id}` : '/ambulance/map'}
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Track on map</span>
                    </Link>
                    <Link
                      to={`/ambulance/cases/${c.id}`}
                      className="text-xs font-bold text-[#16a34a] hover:text-[#15803d] flex items-center gap-1 transition-colors"
                    >
                      <span>View case details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              No emergency cases match the selected filter.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
