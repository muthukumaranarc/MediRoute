import { Hospital, Case, CoordinationRequest, HospitalRecommendation, AdminOverview } from './types';
import { mockApi } from './mockApi';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');
export const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

let backendUnavailable = true;

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
    });
  } catch {
    backendUnavailable = true;
    throw new Error(`Cannot reach MediRoute API at ${API_BASE}. Check that the backend is running and try again.`);
  }

  let data: any = {};
  try { data = await response.json(); } catch { /* Keep a useful HTTP error when the body is empty. */ }
  if (!response.ok) {
    backendUnavailable = false;
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  backendUnavailable = false;
  return data as T;
}

const httpApi = {
  isOfflineMode: () => backendUnavailable,
  checkHealth: () => fetchJson<{ status: string; database: string; dataMode?: string }>('/health'),
  getHospitals: () => fetchJson<Hospital[]>('/hospitals'),
  getHospitalRequests: (hospitalId: string) => fetchJson<CoordinationRequest[]>(`/hospitals/${encodeURIComponent(hospitalId)}/requests`),
  updateAvailability: (hospitalId: string, availability: {
    operationalStatus: 'OPEN' | 'CLOSED'; emergencyIntakeEnabled: boolean; availableEmergencyBeds: number; services: string[]; equipment: string[];
  }) => fetchJson<Hospital>(`/hospitals/${encodeURIComponent(hospitalId)}/availability`, { method: 'PATCH', body: JSON.stringify(availability) }),
  getCases: () => fetchJson<Case[]>('/emergency-cases'),
  getCaseById: (caseId: string) => fetchJson<Case>(`/emergency-cases/${encodeURIComponent(caseId)}`),
  createCase: (data: {
    conditionCategory: string; pickupLatitude: number; pickupLongitude: number; displayAddress: string;
    requiredServices: string[]; requiredEquipment: string[]; notes?: string;
  }) => fetchJson<Case>('/emergency-cases', { method: 'POST', body: JSON.stringify(data) }),
  updateCaseStatus: (caseId: string, status: 'SEARCHING' | 'REQUEST_PENDING' | 'HOSPITAL_ACCEPTED' | 'CANCELLED' | 'COMPLETED') =>
    fetchJson<Case>(`/emergency-cases/${encodeURIComponent(caseId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateCaseDestination: (caseId: string, hospitalId: string) =>
    fetchJson<Case>(`/emergency-cases/${encodeURIComponent(caseId)}/destination`, { method: 'PATCH', body: JSON.stringify({ hospitalId }) }),
  getRecommendations: (caseId: string) => fetchJson<HospitalRecommendation[]>(`/emergency-cases/${encodeURIComponent(caseId)}/recommendations`),
  getRequests: () => fetchJson<CoordinationRequest[]>('/coordination-requests'),
  sendRequest: (caseId: string, hospitalId: string) => fetchJson<CoordinationRequest>('/coordination-requests', { method: 'POST', body: JSON.stringify({ caseId, hospitalId }) }),
  decideRequest: (requestId: string, action: 'ACCEPT' | 'REJECT') => fetchJson<CoordinationRequest>(`/coordination-requests/${encodeURIComponent(requestId)}/decision`, { method: 'PATCH', body: JSON.stringify({ action }) }),
  getOverview: () => fetchJson<AdminOverview>('/admin/overview'),
  resetDemoData: () => {
    if (!DEMO_MODE) throw new Error('Demo data reset is disabled outside demo mode.');
    return fetchJson<{ message: string }>('/admin/demo-data/reset', { method: 'POST' });
  }
};

// Demo mode is an explicit local-only data provider. It never falls back silently
// from the configured API, so production mode cannot mistake sample data for live data.
export const api = DEMO_MODE ? mockApi : httpApi;
