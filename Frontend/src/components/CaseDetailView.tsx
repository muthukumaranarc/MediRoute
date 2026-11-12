import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, 
  CheckCircle2, 
  Clock, 
  RotateCw, 
  Send, 
  AlertTriangle,
  Building2,
  Activity,
  Plus,
  Bed,
  BarChart3,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Case, Hospital, HospitalRecommendation, CoordinationRequest } from '../types';
import { api } from '../api';
import { mockApi } from '../mockApi';
import { DispatchMap } from './DispatchMap';
import { getConditionCategoryInfo } from '../conditionCategories';
import {
  DESTINATION_CHANGE_EVENT,
  getStoredDriverDestinationId,
  isLiveNewCase,
  normalizeRecommendationsForCase,
  setStoredDriverDestinationId
} from '../mapRouting';

interface Props {
  hospitals: Hospital[];
  refresh: () => void;
  flash: (msg: string) => void;
}

export const CaseDetailView: React.FC<Props> = ({ hospitals, refresh, flash }) => {
  const { id } = useParams<{ id: string }>();

  const [emergencyCase, setEmergencyCase] = useState<Case | null>(() => {
    if (!id) return null;
    try {
      return mockApi.getInitialState().cases.find(c => c.id === id) || null;
    } catch {
      return null;
    }
  });
  const [recommendations, setRecommendations] = useState<HospitalRecommendation[]>(() => {
    if (!id) return [];
    return mockApi.getInitialRecommendations(id);
  });
  const [requests, setRequests] = useState<CoordinationRequest[]>(() => {
    if (!id) return [];
    return mockApi.getInitialRequests(id);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExcluded, setShowExcluded] = useState(false);
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [driverSelectedId, setDriverSelectedId] = useState<string | null>(() =>
    id ? getStoredDriverDestinationId(id) : null
  );

  useEffect(() => {
    setDriverSelectedId(id ? getStoredDriverDestinationId(id) : null);
  }, [id]);

  useEffect(() => {
    const onDestChange = () => {
      if (id) setDriverSelectedId(getStoredDriverDestinationId(id));
    };
    window.addEventListener(DESTINATION_CHANGE_EVENT, onDestChange);
    return () => window.removeEventListener(DESTINATION_CHANGE_EVENT, onDestChange);
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [c, r, allReqs] = await Promise.all([
        api.getCaseById(id).catch(() => mockApi.getCaseById(id)),
        api.getRecommendations(id).catch(() => mockApi.getRecommendations(id)),
        api.getRequests().catch(() => mockApi.getRequests())
      ]);
      setEmergencyCase(c);
      setRecommendations(r);
      setRequests(allReqs.filter(q => q.caseId === id));
      setError('');
    } catch {
      try {
        const c = await mockApi.getCaseById(id);
        const r = await mockApi.getRecommendations(id);
        const allReqs = await mockApi.getRequests();
        setEmergencyCase(c);
        setRecommendations(r);
        setRequests(allReqs.filter(q => q.caseId === id));
        setError('');
      } catch (err) {
        setError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      if (!document.hidden) loadData();
    }, 5000);
    return () => clearInterval(timer);
  }, [id]);

  const handleSelectDestination = async (hospital: Hospital) => {
    if (!id || !emergencyCase) return;
    setDriverSelectedId(hospital.id);
    setStoredDriverDestinationId(id, hospital.id);
    setEmergencyCase(prev =>
      prev ? { ...prev, targetHospitalId: hospital.id, targetHospitalName: hospital.name } : prev
    );
    try {
      await api.updateCaseDestination(id, hospital.id);
      await refresh();
    } catch {
      // Keep local selection synced even if backend process hasn't restarted yet
    }
    flash(`✓ Destination set to ${hospital.name}`);
  };

  const handleSendRequest = async (hospital: Hospital) => {
    if (!id) return;
    setIsSendingRequest(hospital.id);
    setDriverSelectedId(hospital.id);
    setStoredDriverDestinationId(id, hospital.id);
    try {
      await api.sendRequest(id, hospital.id);
      await loadData();
      await refresh();
      flash(`✓ Admission request sent to ${hospital.name}! Check Hospital Desk to accept.`);
    } catch (err) {
      flash((err as Error).message);
    } finally {
      setIsSendingRequest(null);
    }
  };

  const handleCompleteCase = async () => {
    if (!id || !emergencyCase) return;
    setIsCompleting(true);
    try {
      await api.updateCaseStatus(id, 'COMPLETED');
      await loadData();
      await refresh();
      flash(`✓ Case ${emergencyCase.caseNumber} marked completed. Route cleared from Live Tracking.`);
    } catch (err) {
      flash((err as Error).message);
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading && !emergencyCase) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-rose-500 border-t-transparent"></div>
        <p className="text-xs text-slate-500 mt-3 font-bold">Matching regional hospitals...</p>
      </div>
    );
  }

  if (error && !emergencyCase) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="p-8 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Case Record Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              This emergency case session could not be located. You can return to active feed or start a new case.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/ambulance/cases" className="btn-primary text-xs w-full sm:w-auto">
              Return to Cases
            </Link>
            <Link to="/ambulance/new-case" className="btn-secondary text-xs w-full sm:w-auto">
              + Create New Case
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!emergencyCase) return null;

  const normalizedRecs = normalizeRecommendationsForCase(emergencyCase, hospitals, recommendations);
  const eligible = normalizedRecs.filter(r => r.eligible);
  const excluded = normalizedRecs.filter(r => !r.eligible);
  const acceptedReq = requests.find(r => r.status === 'ACCEPTED');
  const pendingReq = requests.find(r => r.status === 'PENDING');
  const driverChosenId = driverSelectedId || emergencyCase.targetHospitalId;
  const activeSelectedHospitalId =
    acceptedReq?.hospitalId ||
    (driverChosenId && normalizedRecs.some(r => r.hospital.id === driverChosenId) ? driverChosenId : null) ||
    pendingReq?.hospitalId ||
    eligible[0]?.hospital.id ||
    null;

  // Determine current workflow step
  let currentStep = 2; // Default step: matching
  if (emergencyCase.status === 'REQUEST_PENDING' || pendingReq) currentStep = 3;
  if (emergencyCase.status === 'HOSPITAL_ACCEPTED' || acceptedReq) currentStep = 4;

  // Format required services string
  const allNeeds = [
    ...emergencyCase.requiredServices.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replaceAll('_', ' ')),
    ...emergencyCase.requiredEquipment.map(eq => eq.charAt(0).toUpperCase() + eq.slice(1).toLowerCase())
  ];
  const servicesFormatted = allNeeds.length > 0 ? allNeeds.join(' · ') : 'Standard Emergency Protocol';

  // Format time for Step 1
  const formattedTime = new Date(emergencyCase.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '06:01 AM';

  // Condition category title & styling
  const condInfo = getConditionCategoryInfo(emergencyCase.conditionCategory);
  const conditionTitle = condInfo.name;
  const isCompleted = ['COMPLETED', 'CLOSED', 'CANCELLED'].includes((emergencyCase.status || '').toUpperCase());
  const isLive = isLiveNewCase(emergencyCase);

  return (
    <div className="space-y-6">
      {/* 1. Top Card: Pills, Header, Action Buttons, 3 Info Cards, Paramedic Notes & Stepper */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        {/* Pills Row */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {emergencyCase.caseNumber}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${condInfo.badgeClass}`}>
            {condInfo.shortName}
          </span>
          {isCompleted ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Completed
            </span>
          ) : emergencyCase.status === 'HOSPITAL_ACCEPTED' || acceptedReq ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              Bed Confirmed
            </span>
          ) : emergencyCase.status === 'REQUEST_PENDING' || pendingReq ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              Awaiting ER Response
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              Matching Hospitals
            </span>
          )}
        </div>

        {/* Title and Buttons Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {conditionTitle}
            </h1>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mt-1">
              <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>Pickup: {emergencyCase.displayAddress}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            {isLive && (
              <Link
                to={`/ambulance/map?caseId=${emergencyCase.id}`}
                className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Tracking</span>
              </Link>
            )}
            {isLive && (
              <button
                type="button"
                disabled={isCompleting}
                onClick={handleCompleteCase}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isCompleting ? 'Closing...' : 'Complete Case'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-xs cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              <RotateCw className="w-4 h-4 text-slate-500" />
              <span>Refresh</span>
            </button>
            <Link
              to="/ambulance/new-case"
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New case</span>
            </Link>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Card 1: Pickup Location */}
          <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                PICKUP LOCATION
              </div>
              <div className="text-sm font-bold text-slate-900 truncate mt-0.5" title={emergencyCase.displayAddress}>
                {emergencyCase.displayAddress}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                GPS: {emergencyCase.pickupLatitude.toFixed(4)}, {emergencyCase.pickupLongitude.toFixed(4)}
              </div>
            </div>
          </div>

          {/* Card 2: Required Services */}
          <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="14" x="3" y="7" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                REQUIRED SERVICES
              </div>
              <div className="text-sm font-bold text-slate-900 truncate mt-0.5" title={servicesFormatted}>
                {servicesFormatted}
              </div>
            </div>
          </div>

          {/* Card 3: Admission Status */}
          <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ADMISSION STATUS
              </div>
              <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {isCompleted
                  ? 'Case Completed'
                  : emergencyCase.status === 'HOSPITAL_ACCEPTED' || acceptedReq
                  ? 'Bed Reserved'
                  : emergencyCase.status === 'REQUEST_PENDING' || pendingReq
                  ? 'Request Pending'
                  : 'Hospital Review'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {eligible.length} network options ready
              </div>
            </div>
          </div>
        </div>

        {/* Paramedic Notes Banner */}
        {emergencyCase.notes && (
          <div className="mt-4 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 fill-[#D97706]/20" />
            <span>
              <strong className="font-bold text-[#92400E]">Paramedic Notes:</strong> {emergencyCase.notes}
            </span>
          </div>
        )}

        {/* Full-Width Stepper Tracker */}
        <div className="mt-6 pt-3 pb-2 flex items-center justify-between w-full">
          {/* Node 1: Case Logged */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#059669] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              ✓
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 leading-tight">Case Logged</span>
              <span className="text-[11px] text-slate-400 leading-tight mt-0.5">{formattedTime}</span>
            </div>
          </div>

          {/* Connector 1-2 */}
          <div className="h-[2px] flex-1 mx-6 bg-[#059669] rounded-full" />

          {/* Node 2: Hospital Match */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#059669] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {currentStep > 2 ? '✓' : '2'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 leading-tight">Hospital Match</span>
              <span className="text-[11px] text-[#059669] font-medium leading-tight mt-0.5">
                {currentStep > 2 ? 'Matched' : 'In Progress'}
              </span>
            </div>
          </div>

          {/* Connector 2-3 */}
          <div className={`h-[2px] flex-1 mx-6 rounded-full ${currentStep >= 3 ? 'bg-[#059669]' : 'bg-slate-200'}`} />

          {/* Node 3: Request Sent */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                currentStep >= 3
                  ? 'bg-[#059669] text-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-400'
              }`}
            >
              {currentStep > 3 ? '✓' : '3'}
            </div>
            <div className="flex flex-col">
              <span className={`text-xs leading-tight ${currentStep >= 3 ? 'font-bold text-slate-800' : 'font-semibold text-slate-600'}`}>
                Request Sent
              </span>
              <span className={`text-[11px] leading-tight mt-0.5 ${currentStep === 3 ? 'text-[#059669] font-medium' : 'text-slate-400'}`}>
                {currentStep > 3 ? 'Sent' : currentStep === 3 ? 'Awaiting ER' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Connector 3-4 */}
          <div className={`h-[2px] flex-1 mx-6 rounded-full ${currentStep >= 4 ? 'bg-[#059669]' : 'bg-slate-200'}`} />

          {/* Node 4: Bed Confirmed */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                currentStep >= 4
                  ? 'bg-[#059669] text-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-400'
              }`}
            >
              {currentStep >= 4 ? '✓' : '4'}
            </div>
            <div className="flex flex-col">
              <span className={`text-xs leading-tight ${currentStep >= 4 ? 'font-bold text-slate-800' : 'font-semibold text-slate-600'}`}>
                Bed Confirmed
              </span>
              <span className={`text-[11px] leading-tight mt-0.5 ${currentStep >= 4 ? 'text-[#059669] font-medium' : 'text-slate-400'}`}>
                {currentStep >= 4 ? 'Confirmed' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Content: Recommended Hospitals on Left, Leaflet Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recommended Hospitals */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recommended Hospitals</h2>
              {eligible.length > 1 && !acceptedReq && !isCompleted && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Nearest hospital selected on map by default · Choose another hospital below to change destination
                </p>
              )}
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 flex-shrink-0">
              {eligible.length} {eligible.length === 1 ? 'option' : 'options'}
            </span>
          </div>

          {eligible.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-2">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
              <p className="text-xs font-semibold text-slate-500">
                Finding nearest available hospitals in the network...
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {(showAllRecommended ? eligible : eligible.slice(0, 4)).map((rec, index) => {
                const h = rec.hospital;
                const isRequested = requests.some(q => q.hospitalId === h.id && q.status === 'PENDING');
                const isAccepted = requests.some(q => q.hospitalId === h.id && q.status === 'ACCEPTED');
                const isSelectedOnMap = h.id === activeSelectedHospitalId;
                const canSwitchToHospital = !acceptedReq && !isCompleted && eligible.length > 1 && !isSelectedOnMap;

                const addressText = h.address;
                const displayDist = rec.distanceKm.toFixed(1);
                const displayBeds = h.availableEmergencyBeds;
                const displayScore = `${rec.score.toFixed(1)}%`;

                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      if (canSwitchToHospital) handleSelectDestination(h);
                    }}
                    className={`rounded-2xl p-4 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelectedOnMap
                        ? 'border-2 border-[#10B981] bg-[#F0FDF4]/30'
                        : canSwitchToHospital
                        ? 'border border-slate-200 bg-white hover:border-emerald-300 cursor-pointer'
                        : 'border border-slate-200 bg-white'
                    }`}
                  >
                    {/* Left Group: Big Number Badge + Hospital Details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-12 h-12 rounded-xl font-bold text-lg flex items-center justify-center flex-shrink-0 ${
                        isSelectedOnMap
                          ? 'bg-[#D1FAE5] text-[#065F46]'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {index + 1}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900 truncate">
                            {h.name}
                          </h3>
                          {index === 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Nearest
                            </span>
                          )}
                          {isSelectedOnMap && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Selected Destination
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {addressText}
                        </p>

                        {/* Stats Row */}
                        <div className="flex items-center gap-3 pt-0.5 flex-wrap text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            <span>{displayDist} km</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{displayBeds} Beds Ready</span>
                          </span>
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                            <span>Match {displayScore}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Group: Action Buttons */}
                    <div
                      className="flex items-center gap-2 flex-wrap flex-shrink-0 self-end sm:self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canSwitchToHospital && (
                        <button
                          type="button"
                          onClick={() => handleSelectDestination(h)}
                          className="px-3 py-2 bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Use Hospital
                        </button>
                      )}

                      {isAccepted ? (
                        <span className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>Accepted</span>
                        </span>
                      ) : isRequested ? (
                        <span className="px-3.5 py-2 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-xl text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Request Sent</span>
                        </span>
                      ) : isSelectedOnMap ? (
                        <button
                          type="button"
                          onClick={() => handleSendRequest(h)}
                          disabled={emergencyCase.status === 'HOSPITAL_ACCEPTED' || isCompleted || isSendingRequest === h.id}
                          className="px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingRequest === h.id ? 'Sending...' : 'Send Request'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendRequest(h)}
                          disabled={emergencyCase.status === 'HOSPITAL_ACCEPTED' || isCompleted || isSendingRequest === h.id}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span>{isSendingRequest === h.id ? 'Sending...' : 'Request Acceptance'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {eligible.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecommended(!showAllRecommended)}
                  className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {showAllRecommended ? 'Show fewer hospitals' : `Show all ${eligible.length} recommended hospitals`}
                </button>
              )}
            </div>
          )}

          {/* Excluded Hospitals Collapsible */}
          {excluded.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <button
                type="button"
                onClick={() => setShowExcluded(!showExcluded)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <span>Excluded Hospitals ({excluded.length})</span>
                </div>
                {showExcluded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showExcluded && (
                <div className="mt-3 divide-y divide-slate-100 text-xs space-y-2">
                  {excluded.map(ex => (
                    <div key={ex.hospital.id} className="pt-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800">{ex.hospital.name}</div>
                        <div className="text-[11px] text-slate-500">{ex.distanceKm.toFixed(1)} km away</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-semibold">
                          {ex.exclusionReasons.join(' · ') || 'Ineligible'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Hospital & Pickup Map Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs sticky top-20">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500 fill-rose-500" />
              <h3 className="font-bold text-sm text-slate-900">Hospital &amp; Pickup Map</h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
              Namakkal Region
            </span>
          </div>

          <DispatchMap
            emergencyCase={emergencyCase}
            hospitals={hospitals}
            recommendations={recommendations}
            selectedHospitalId={activeSelectedHospitalId}
            onSelectHospital={(hospId) => {
              const found = normalizedRecs.find(r => r.hospital.id === hospId)?.hospital;
              if (found && !acceptedReq && !isCompleted) {
                handleSelectDestination(found);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
