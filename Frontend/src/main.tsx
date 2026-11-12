import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api';
import { mockApi } from './mockApi';
import { Hospital, Case, CoordinationRequest, UserRole } from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HowItWorksModal } from './components/HowItWorksModal';
import { DashboardView } from './components/DashboardView';
import { CasesListView } from './components/CasesListView';
import { FullMapView } from './components/FullMapView';
import { NewCaseView } from './components/NewCaseView';
import { CaseDetailView } from './components/CaseDetailView';
import { HospitalDeskView } from './components/HospitalDeskView';
import { AmbulanceNetworkView } from './components/AmbulanceNetworkView';
import { AdminView } from './components/AdminView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CheckCircle2, X } from 'lucide-react';
import { DEMO_MODE } from './api';
import './style.css';

function App() {
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>(
    (localStorage.getItem('mediroute_role') as UserRole) || 'Ambulance Operator'
  );
  
  const initialData = mockApi.getInitialState();
  const [hospitals, setHospitals] = useState<Hospital[]>(initialData.hospitals);
  const [cases, setCases] = useState<Case[]>(initialData.cases);
  const [requests, setRequests] = useState<CoordinationRequest[]>(initialData.requests);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    localStorage.getItem('mediroute_hospital') || (initialData.hospitals[0]?.id ?? '')
  );
  const [apiStatus, setApiStatus] = useState<'connecting' | 'online' | 'offline'>('online');
  const [toastMessage, setToastMessage] = useState('');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const flash = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const refreshData = async () => {
    try {
      const [health, hList, cList, rList] = await Promise.all([
        api.checkHealth().catch(() => ({ status: 'STANDBY', database: 'STANDBY' })),
        api.getHospitals().catch(() => mockApi.getHospitals()),
        api.getCases().catch(() => mockApi.getCases()),
        api.getRequests().catch(() => mockApi.getRequests())
      ]);

      const finalHospitals = hList && hList.length > 0 ? hList : await mockApi.getHospitals();
      const defaultCases = await mockApi.getCases();
      const combinedCases = [...(cList || [])];
      for (const dc of defaultCases) {
        if (!combinedCases.some(c => c.caseNumber === dc.caseNumber || c.id === dc.id)) {
          combinedCases.push(dc);
        }
      }
      const finalCases = combinedCases.map(c => {
        const match = defaultCases.find(dc => dc.caseNumber === c.caseNumber);
        if (match) {
          return {
            ...c,
            assignedAmbulanceCallSign: c.assignedAmbulanceCallSign || match.assignedAmbulanceCallSign,
            assignedAmbulanceState: c.assignedAmbulanceState || match.assignedAmbulanceState,
            ambulanceUnitType: c.ambulanceUnitType || match.ambulanceUnitType,
            targetHospitalName: c.targetHospitalName || match.targetHospitalName,
            etaMinutes: c.etaMinutes ?? match.etaMinutes,
            paramedicName: c.paramedicName || match.paramedicName
          };
        }
        return c;
      });
      const finalRequests = rList && rList.length > 0 ? rList : await mockApi.getRequests();

      setHospitals(prev => JSON.stringify(prev) === JSON.stringify(finalHospitals) ? prev : finalHospitals);
      setCases(prev => JSON.stringify(prev) === JSON.stringify(finalCases) ? prev : finalCases);
      setRequests(prev => JSON.stringify(prev) === JSON.stringify(finalRequests) ? prev : finalRequests);
      setApiStatus(health.status === 'UP' ? 'online' : 'offline');

      // Auto-select valid hospital if current is missing
      if (!finalHospitals.some(h => h.id === selectedHospitalId) && finalHospitals.length > 0) {
        setSelectedHospitalId(finalHospitals[0].id);
      }
    } catch {
      const [fallbackH, fallbackC, fallbackR] = await Promise.all([
        mockApi.getHospitals(),
        mockApi.getCases(),
        mockApi.getRequests()
      ]);
      setHospitals(fallbackH);
      setCases(fallbackC);
      setRequests(fallbackR);
      setApiStatus('offline');
    }
  };

  // Initial load and periodic refresh every 7 seconds
  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      if (!document.hidden) refreshData();
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('mediroute_role', role);
    if (selectedHospitalId) localStorage.setItem('mediroute_hospital', selectedHospitalId);
  }, [role, selectedHospitalId]);

  const handleLaunchQuickDemo = async () => {
    try {
      const demo = await api.createCase({
        conditionCategory: 'CARDIAC',
        pickupLatitude: 11.3792,
        pickupLongitude: 77.8950,
        displayAddress: 'Tiruchengode New Bus Stand',
        requiredServices: ['CARDIAC', 'GENERAL_EMERGENCY'],
        requiredEquipment: ['DEFIBRILLATOR', 'ECG'],
        notes: 'Interactive demo case for first-time user tour'
      });
      await refreshData();
      flash('⚡ Demo case created! Searching matching regional hospitals...');
      navigate(`/ambulance/cases/${demo.id}`);
    } catch (err) {
      flash((err as Error).message);
    }
  };

  return (
    <div className="mediroute-app-shell">
      {/* 1. Single Unified Left Sidebar */}
      <Sidebar 
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        onOpenSettings={() => {
          const nextRole: UserRole = role === 'Ambulance Operator' ? 'Hospital Staff' : 'Ambulance Operator';
          setRole(nextRole);
          flash(`Switched active profile role to ${nextRole}`);
        }}
      />

      {/* 2. Main Content Flow (TopBar + Viewport) */}
      <div className="mediroute-main-content-flow">
        {/* Slim Top Bar */}
        <TopBar
          onRefresh={refreshData}
          apiConnected={apiStatus === 'online'}
          role={role}
          onToggleRole={() => {
            const nextRole: UserRole = role === 'Ambulance Operator' ? 'Hospital Staff' : 'Ambulance Operator';
            setRole(nextRole);
            flash(`Switched active profile role to ${nextRole}`);
          }}
          cases={cases}
          requests={requests}
          hospitals={hospitals}
        />

        {/* Dynamic Route Viewport */}
        <main className="mediroute-route-viewport pb-24 md:pb-10">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/ambulance" replace />}
            />
            <Route
              path="/ambulance"
              element={
                <DashboardView
                  cases={cases}
                  requests={requests}
                  hospitals={hospitals}
                  refresh={refreshData}
                  flash={flash}
                />
              }
            />
            <Route
              path="/ambulance/cases"
              element={
                <CasesListView
                  cases={cases}
                  requests={requests}
                  hospitals={hospitals}
                  refresh={refreshData}
                  flash={flash}
                />
              }
            />
            <Route
              path="/cases"
              element={<Navigate to="/ambulance/cases" replace />}
            />
            <Route
              path="/ambulance/map"
              element={
                <FullMapView
                  cases={cases}
                  hospitals={hospitals}
                  requests={requests}
                  refresh={refreshData}
                  flash={flash}
                />
              }
            />
            <Route
              path="/map"
              element={<Navigate to="/ambulance/map" replace />}
            />
            <Route
              path="/ambulance/new-case"
              element={
                <NewCaseView
                  refresh={refreshData}
                  flash={flash}
                />
              }
            />
            <Route
              path="/ambulance/cases/:id"
              element={
                <CaseDetailView
                  hospitals={hospitals}
                  refresh={refreshData}
                  flash={flash}
                />
              }
            />
            <Route
              path="/hospital"
              element={
                <HospitalDeskView
                  hospitals={hospitals}
                  selectedHospitalId={selectedHospitalId}
                  setSelectedHospitalId={setSelectedHospitalId}
                  refresh={refreshData}
                  flash={flash}
                />
              }
            />
            <Route
              path="/ambulance/network"
              element={
                <AmbulanceNetworkView
                  cases={cases}
                  hospitals={hospitals}
                  flash={flash}
                />
              }
            />
            <Route
              path="/ambulances"
              element={<Navigate to="/ambulance/network" replace />}
            />
            <Route
              path="/admin"
              element={
                <AdminView
                  refresh={refreshData}
                  flash={flash}
                  demoMode={DEMO_MODE}
                />
              }
            />
            <Route
              path="*"
              element={<Navigate to="/ambulance" replace />}
            />
          </Routes>
        </main>
      </div>

      {/* 3. Mobile Floating Bottom Navigation Dock (< md) */}
      <MobileBottomNav />

      {/* How it Works Interactive Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onLaunchDemo={handleLaunchQuickDemo}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
            <span>{toastMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => setToastMessage('')} 
            className="text-slate-400 hover:text-white cursor-pointer"
            aria-label="Dismiss toast notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
