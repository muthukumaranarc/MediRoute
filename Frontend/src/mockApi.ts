import type { AdminOverview, Case, CoordinationRequest, Hospital, HospitalRecommendation } from './types';
import { DEFAULT_CASES } from './fleetData';

type DemoEvent = AdminOverview['events'][number] & { hospitalId: string };
interface DemoState {
  version: 3;
  hospitals: Hospital[];
  cases: Case[];
  requests: CoordinationRequest[];
  events: DemoEvent[];
}

const STORAGE_KEY = 'mediroute_dashboard_state_v7';
const FRESHNESS_MS = 5 * 60 * 1000;
let memoryState: DemoState | undefined;

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function initialState(): DemoState {
  const now = new Date().toISOString();

  // Network hospitals across Namakkal and Erode regions (20 major facilities)
  const hospitals: Hospital[] = [
    {
      id: 'gmch-namakkal',
      name: 'Namakkal Govt Medical College Hospital',
      address: 'Collectorate Campus, Mohanur Road, Namakkal - 637003',
      latitude: 11.2189,
      longitude: 78.1674,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 18,
      totalEmergencyBeds: 30,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'TRAUMA', 'STROKE', 'RESPIRATORY', 'GENERAL_EMERGENCY'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN', 'VENTILATOR', 'CT'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'gh-tiruchengode',
      name: 'Govt Headquarters Hospital Tiruchengode',
      address: 'Velur Road, Tiruchengode, Namakkal - 637211',
      latitude: 11.3812,
      longitude: 77.8935,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 8,
      totalEmergencyBeds: 16,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'TRAUMA', 'STROKE', 'RESPIRATORY', 'GENERAL_EMERGENCY'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN', 'VENTILATOR', 'CT'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'vmch-tiruchengode',
      name: 'Vivekanandha Medical Care Hospital',
      address: 'Elayampalayam, Tiruchengode, Namakkal - 637205',
      latitude: 11.3542,
      longitude: 77.9298,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 12,
      totalEmergencyBeds: 25,
      intakeStatus: 'Accepting emergencies',
      services: ['TRAUMA', 'CARDIAC', 'GENERAL_EMERGENCY', 'RESPIRATORY'],
      equipment: ['CT', 'VENTILATOR', 'DEFIBRILLATOR', 'OXYGEN', 'ECG'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'gh-kumarapalayam',
      name: 'Government Hospital Kumarapalayam',
      address: 'Pallipalayam Main Road, Kumarapalayam, Namakkal - 638183',
      latitude: 11.4428,
      longitude: 77.7180,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 9,
      totalEmergencyBeds: 15,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'TRAUMA', 'GENERAL_EMERGENCY'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'jkkn-kumarapalayam',
      name: 'JKKN Multi-Speciality Hospital',
      address: 'NH 544 Salem-Kochi Highway, Kumarapalayam, Namakkal - 638183',
      latitude: 11.4495,
      longitude: 77.7285,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 10,
      totalEmergencyBeds: 20,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'STROKE', 'TRAUMA', 'GENERAL_EMERGENCY'],
      equipment: ['DEFIBRILLATOR', 'ECG', 'CT', 'VENTILATOR', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'thangam-namakkal',
      name: 'Thangam Hospital & Research Institute',
      address: 'Salem Main Road, Namakkal - 637001',
      latitude: 11.2290,
      longitude: 78.1620,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 7,
      totalEmergencyBeds: 15,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'RESPIRATORY', 'GENERAL_EMERGENCY', 'TRAUMA'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN', 'VENTILATOR'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'gh-rasipuram',
      name: 'Government Hospital Rasipuram',
      address: 'Attur Main Road, Rasipuram, Namakkal - 637408',
      latitude: 11.4582,
      longitude: 78.1712,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 8,
      totalEmergencyBeds: 16,
      intakeStatus: 'Accepting emergencies',
      services: ['TRAUMA', 'CARDIAC', 'RESPIRATORY', 'GENERAL_EMERGENCY'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN', 'VENTILATOR'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'gh-velur',
      name: 'Government Hospital Paramathi Velur',
      address: 'Karur-Namakkal Highway, Paramathi Velur, Namakkal - 637207',
      latitude: 11.0450,
      longitude: 78.0120,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 6,
      totalEmergencyBeds: 12,
      intakeStatus: 'Accepting emergencies',
      services: ['TRAUMA', 'GENERAL_EMERGENCY', 'CARDIAC'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'cm-tiruchengode',
      name: 'Dr. Chenniappan Memorial Hospital',
      address: 'Velur Road, Tiruchengode, Namakkal - 637211',
      latitude: 11.3760,
      longitude: 77.8965,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 5,
      totalEmergencyBeds: 10,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'GENERAL_EMERGENCY'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'aravind-namakkal',
      name: 'Aravind Ortho & Trauma Centre',
      address: 'Mohanur Road, Namakkal - 637001',
      latitude: 11.2165,
      longitude: 78.1685,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 6,
      totalEmergencyBeds: 12,
      intakeStatus: 'Accepting emergencies',
      services: ['TRAUMA', 'GENERAL_EMERGENCY'],
      equipment: ['CT', 'OXYGEN', 'ECG'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'gh-erode',
      name: 'Government Headquarters Hospital Erode',
      address: 'Brough Road, Erode - 638001',
      latitude: 11.3410,
      longitude: 77.7240,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 22,
      totalEmergencyBeds: 40,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'TRAUMA', 'STROKE', 'RESPIRATORY', 'GENERAL_EMERGENCY'],
      equipment: ['CT', 'VENTILATOR', 'DEFIBRILLATOR', 'ECG', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'gmch-perundurai',
      name: 'Govt Medical College Hospital Perundurai (IRT)',
      address: 'Sanatorium, Perundurai, Erode - 638053',
      latitude: 11.2785,
      longitude: 77.5835,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 16,
      totalEmergencyBeds: 30,
      intakeStatus: 'Accepting emergencies',
      services: ['RESPIRATORY', 'TRAUMA', 'CARDIAC', 'GENERAL_EMERGENCY', 'STROKE'],
      equipment: ['VENTILATOR', 'CT', 'DEFIBRILLATOR', 'ECG', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'lotus-erode',
      name: 'Lotus Hospital & Research Centre',
      address: '172, Poondurai Main Road, Kollampalayam, Erode - 638002',
      latitude: 11.3280,
      longitude: 77.7215,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 14,
      totalEmergencyBeds: 25,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'TRAUMA', 'STROKE', 'GENERAL_EMERGENCY'],
      equipment: ['CT', 'VENTILATOR', 'DEFIBRILLATOR', 'ECG', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'care24-erode',
      name: 'Care 24 Medical Centre & Emergency Hospital',
      address: '216, Perundurai Road, Kumalan Kuttai, Erode - 638011',
      latitude: 11.3475,
      longitude: 77.7020,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 10,
      totalEmergencyBeds: 20,
      intakeStatus: 'Accepting emergencies',
      services: ['TRAUMA', 'CARDIAC', 'GENERAL_EMERGENCY', 'RESPIRATORY'],
      equipment: ['DEFIBRILLATOR', 'ECG', 'OXYGEN', 'VENTILATOR'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'sudha-erode',
      name: 'Sudha Hospitals Emergency & Critical Care',
      address: '80, Perundurai Road, Erode - 638011',
      latitude: 11.3490,
      longitude: 77.6980,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 12,
      totalEmergencyBeds: 22,
      intakeStatus: 'Accepting emergencies',
      services: ['CARDIAC', 'STROKE', 'TRAUMA', 'GENERAL_EMERGENCY'],
      equipment: ['CT', 'VENTILATOR', 'DEFIBRILLATOR', 'ECG', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'maruthi-erode',
      name: 'Maruthi Medical Center & Hospital (MMCH)',
      address: 'Sathy Road, Erode - 638003',
      latitude: 11.3530,
      longitude: 77.7270,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 11,
      totalEmergencyBeds: 20,
      intakeStatus: 'Accepting emergencies',
      services: ['TRAUMA', 'CARDIAC', 'GENERAL_EMERGENCY'],
      equipment: ['DEFIBRILLATOR', 'ECG', 'OXYGEN', 'VENTILATOR'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'gh-bhavani',
      name: 'Government Hospital Bhavani',
      address: 'Kalingarayanpalayam, Bhavani, Erode - 638301',
      latitude: 11.4480,
      longitude: 77.6830,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 8,
      totalEmergencyBeds: 15,
      intakeStatus: 'Accepting emergencies',
      services: ['TRAUMA', 'GENERAL_EMERGENCY', 'CARDIAC'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'gh-gobi',
      name: 'Government Hospital Gobichettipalayam',
      address: 'Hospital Road, Gobichettipalayam, Erode - 638452',
      latitude: 11.4540,
      longitude: 77.4380,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 9,
      totalEmergencyBeds: 18,
      intakeStatus: 'Accepting emergencies',
      services: ['TRAUMA', 'CARDIAC', 'GENERAL_EMERGENCY', 'RESPIRATORY'],
      equipment: ['CT', 'ECG', 'DEFIBRILLATOR', 'OXYGEN', 'VENTILATOR'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'kalyani-erode',
      name: 'Kalyani Multi Speciality Hospital',
      address: 'Park Road, Erode - 638001',
      latitude: 11.3450,
      longitude: 77.7190,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 7,
      totalEmergencyBeds: 14,
      intakeStatus: 'Accepting emergencies',
      services: ['GENERAL_EMERGENCY', 'CARDIAC'],
      equipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    },
    {
      id: 'ecc-thindal',
      name: 'Erode Multispeciality Hospital & Cancer Centre',
      address: 'Perundurai Main Road, Thindal, Erode - 638012',
      latitude: 11.3250,
      longitude: 77.6690,
      operationalStatus: 'OPEN',
      emergencyIntakeEnabled: true,
      availableEmergencyBeds: 8,
      totalEmergencyBeds: 16,
      intakeStatus: 'Accepting emergencies',
      services: ['GENERAL_EMERGENCY', 'RESPIRATORY', 'TRAUMA'],
      equipment: ['CT', 'VENTILATOR', 'OXYGEN', 'ECG'],
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      availabilitySource: 'LIVE'
    }
  ];

  // Active regional emergency cases across Namakkal and Erode with live ambulance telemetry states
  const cases: Case[] = [...DEFAULT_CASES];

  const requests: CoordinationRequest[] = [
    {
      id: 'req-demo-110',
      caseId: 'case-demo-110',
      hospitalId: 'gmch-namakkal',
      status: 'ACCEPTED',
      distanceKm: 1.2,
      createdAt: '2026-10-18T14:18:00.000Z'
    }
  ];

  return {
    version: 3,
    hospitals,
    cases,
    requests,
    events: [
      {
        id: 'evt-001',
        hospitalId: 'gmch-namakkal',
        type: 'CAPACITY_RESERVED',
        summary: 'Emergency bed locked for MR-2026-0110 en route to Namakkal GMCH',
        timestamp: '2026-10-18T14:18:00.000Z'
      }
    ]
  };
}

function readState(): DemoState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DemoState;
      if (parsed.version === 3 && Array.isArray(parsed.hospitals) && Array.isArray(parsed.cases) && Array.isArray(parsed.requests)) {
        memoryState = parsed;
        return parsed;
      }
    }
  } catch {}
  if (memoryState) return memoryState;
  memoryState = initialState();
  writeState(memoryState);
  return memoryState;
}

function writeState(state: DemoState): void {
  memoryState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function requireCase(state: DemoState, caseId: string): Case {
  const found = state.cases.find(c => c.id === caseId);
  if (!found) throw new Error('Case not found');
  return found;
}

function requireHospital(state: DemoState, hospitalId: string): Hospital {
  const found = state.hospitals.find(h => h.id === hospitalId);
  if (!found) throw new Error('Hospital not found');
  return found;
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function recommendations(state: DemoState, emergencyCase: Case): HospitalRecommendation[] {
  const evaluated = state.hospitals.map(hospital => {
    const reasons: string[] = [];
    if (hospital.operationalStatus !== 'OPEN') reasons.push('Hospital is closed');
    if (!hospital.emergencyIntakeEnabled) reasons.push('Emergency intake is disabled');
    if (hospital.availableEmergencyBeds < 1) reasons.push('No available emergency beds');
    const missingServices = emergencyCase.requiredServices.filter(service => !hospital.services.includes(service));
    const hasServices = missingServices.length === 0;
    if (!hasServices) reasons.push(`Missing required service(s): ${missingServices.join(', ')}`);
    const missingEquipment = emergencyCase.requiredEquipment.filter(item => !hospital.equipment.includes(item));
    if (missingEquipment.length) reasons.push(`Missing required equipment: ${missingEquipment.join(', ')}`);
    const fresh = true; // In demo mode all records remain valid
    const km = distanceKm(emergencyCase.pickupLatitude, emergencyCase.pickupLongitude, hospital.latitude, hospital.longitude);
    const strictOk = reasons.length === 0;
    const rawScore = 0.6 * Math.max(0, 100 - km * 5) + 0.25 * Math.min(100, hospital.availableEmergencyBeds * 10) + 0.15 * 100;
    return {
      hospital,
      strictOk,
      hasServices,
      reasons,
      km: Math.round(km * 10) / 10,
      rawScore: Math.round(rawScore * 10) / 10,
      fresh
    };
  });

  const hasStrict = evaluated.some(item => item.strictOk);
  const fallbackIds = new Set<string>();
  if (!hasStrict && evaluated.length > 0) {
    let tier = evaluated.filter(
      item =>
        item.hospital.operationalStatus === 'OPEN' &&
        item.hospital.emergencyIntakeEnabled &&
        item.hospital.availableEmergencyBeds > 0 &&
        item.hasServices
    );
    if (tier.length === 0) {
      tier = evaluated.filter(
        item => item.hospital.operationalStatus === 'OPEN' && item.hospital.availableEmergencyBeds > 0
      );
    }
    if (tier.length === 0) {
      tier = evaluated.filter(item => item.hospital.operationalStatus === 'OPEN');
    }
    if (tier.length === 0) {
      tier = evaluated;
    }
    [...tier]
      .sort((a, b) => a.km - b.km || b.hospital.availableEmergencyBeds - a.hospital.availableEmergencyBeds)
      .slice(0, 4)
      .forEach(item => fallbackIds.add(item.hospital.id));
  }

  return evaluated
    .map(item => {
      const eligible = item.strictOk || fallbackIds.has(item.hospital.id);
      const isFallback = fallbackIds.has(item.hospital.id);
      return {
        hospital: item.hospital,
        eligible,
        exclusionReasons: isFallback ? [] : item.reasons,
        distanceKm: item.km,
        distanceMethod: 'HAVERSINE_STRAIGHT_LINE',
        score: eligible ? Math.max(isFallback ? 10 : 0, item.rawScore) : 0,
        freshness: item.fresh ? 'FRESH' : 'STALE',
        rankingExplanation: isFallback
          ? 'Nearest available emergency fallback hospital (sorted closest first).'
          : 'Ranking uses nearest distance first, alongside ICU capacity and freshness.'
      };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.distanceKm - b.distanceKm || b.score - a.score);
}

export const mockApi = {
  getInitialState: () => readState(),
  getInitialRecommendations: (caseId: string) => {
    try {
      const state = readState();
      return recommendations(state, requireCase(state, caseId));
    } catch {
      return [];
    }
  },
  getInitialRequests: (caseId?: string) => {
    try {
      const reqs = readState().requests;
      return caseId ? reqs.filter(r => r.caseId === caseId) : reqs;
    } catch {
      return [];
    }
  },
  isOfflineMode: () => false,
  checkHealth: async () => ({ status: 'UP', database: 'UP', dataMode: 'DEMO' }),
  getHospitals: async () => readState().hospitals,
  getHospitalRequests: async (hospitalId: string) => readState().requests.filter(r => r.hospitalId === hospitalId),
  updateAvailability: async (hospitalId: string, availability: {
    operationalStatus: 'OPEN' | 'CLOSED'; emergencyIntakeEnabled: boolean; availableEmergencyBeds: number; services: string[]; equipment: string[];
  }) => {
    const state = readState();
    const hospital = requireHospital(state, hospitalId);
    Object.assign(hospital, availability, { lastUpdatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    writeState(state);
    return hospital;
  },
  getCases: async () => readState().cases,
  getCaseById: async (caseId: string) => requireCase(readState(), caseId),
  createCase: async (data: {
    conditionCategory: string; pickupLatitude: number; pickupLongitude: number; displayAddress: string;
    requiredServices: string[]; requiredEquipment: string[]; notes?: string;
  }) => {
    const state = readState();
    const now = new Date().toISOString();
    const id = `case-live-${makeId()}`;
    const caseNumber = `MR-2026-0${110 + state.cases.length + 1}`;
    const created: Case = {
      id,
      caseNumber,
      conditionCategory: data.conditionCategory,
      pickupLatitude: data.pickupLatitude,
      pickupLongitude: data.pickupLongitude,
      displayAddress: data.displayAddress,
      requiredServices: [...data.requiredServices],
      requiredEquipment: [...data.requiredEquipment],
      notes: data.notes,
      status: 'SEARCHING',
      createdAt: now,
      updatedAt: now
    };
    state.cases.unshift(created);
    writeState(state);
    return created;
  },
  updateCaseStatus: async (caseId: string, status: 'SEARCHING' | 'REQUEST_PENDING' | 'HOSPITAL_ACCEPTED' | 'CANCELLED' | 'COMPLETED') => {
    const state = readState();
    const emergencyCase = requireCase(state, caseId);
    emergencyCase.status = status;
    emergencyCase.updatedAt = new Date().toISOString();
    writeState(state);
    return emergencyCase;
  },
  updateCaseDestination: async (caseId: string, hospitalId: string) => {
    const state = readState();
    const emergencyCase = requireCase(state, caseId);
    const hospital = requireHospital(state, hospitalId);
    emergencyCase.targetHospitalId = hospital.id;
    emergencyCase.targetHospitalName = hospital.name;
    emergencyCase.updatedAt = new Date().toISOString();
    writeState(state);
    return emergencyCase;
  },
  getRecommendations: async (caseId: string) => {
    const state = readState();
    return recommendations(state, requireCase(state, caseId));
  },
  getRequests: async () => readState().requests,
  sendRequest: async (caseId: string, hospitalId: string) => {
    const state = readState();
    const emergencyCase = requireCase(state, caseId);
    const hospital = requireHospital(state, hospitalId);
    const match = recommendations(state, emergencyCase).find(item => item.hospital.id === hospitalId);
    const request: CoordinationRequest = {
      id: `req-live-${makeId()}`,
      caseId,
      hospitalId,
      status: 'PENDING',
      distanceKm: match?.distanceKm || 2.5,
      createdAt: new Date().toISOString()
    };
    state.requests.unshift(request);
    emergencyCase.status = 'REQUEST_PENDING';
    emergencyCase.targetHospitalId = hospital.id;
    emergencyCase.targetHospitalName = hospital.name;
    emergencyCase.updatedAt = request.createdAt;
    writeState(state);
    return request;
  },
  decideRequest: async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    const state = readState();
    const request = state.requests.find(r => r.id === requestId);
    if (!request) throw new Error('Request not found');
    const emergencyCase = requireCase(state, request.caseId);
    const hospital = requireHospital(state, request.hospitalId);

    if (action === 'REJECT') {
      request.status = 'REJECTED';
      emergencyCase.status = 'SEARCHING';
    } else {
      hospital.availableEmergencyBeds = Math.max(0, hospital.availableEmergencyBeds - 1);
      hospital.lastUpdatedAt = new Date().toISOString();
      request.status = 'ACCEPTED';
      emergencyCase.status = 'HOSPITAL_ACCEPTED';
    }
    writeState(state);
    return request;
  },
  getOverview: async (): Promise<AdminOverview> => {
    const state = readState();
    return {
      totalHospitals: state.hospitals.length,
      openHospitals: state.hospitals.filter(h => h.operationalStatus === 'OPEN').length,
      intakeEnabled: state.hospitals.filter(h => h.emergencyIntakeEnabled).length,
      activeCases: state.cases.filter(c => ['SEARCHING', 'REQUEST_PENDING'].includes(c.status)).length,
      pendingRequests: state.requests.filter(r => r.status === 'PENDING').length,
      acceptedRequests: state.requests.filter(r => r.status === 'ACCEPTED').length,
      events: state.events.map(({ id, type, summary, timestamp }) => ({ id, type, summary, timestamp })),
      requests: state.requests
    };
  },
  resetDemoData: async () => {
    writeState(initialState());
    return { message: 'Demo records restored to Namakkal, Tiruchengode & Kumarapalayam defaults.' };
  }
};
