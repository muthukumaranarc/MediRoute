export interface Hospital {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  operationalStatus: 'OPEN' | 'CLOSED';
  emergencyIntakeEnabled: boolean;
  availableEmergencyBeds: number;
  totalEmergencyBeds?: number;
  intakeStatus?: 'Accepting emergencies' | 'Limited capacity' | 'Intake paused';
  services: string[];
  equipment: string[];
  lastUpdatedAt: string;
  createdAt?: string;
  updatedAt?: string;
  availabilitySource?: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  conditionCategory: string;
  pickupLatitude: number;
  pickupLongitude: number;
  displayAddress: string;
  requiredServices: string[];
  requiredEquipment: string[];
  notes?: string;
  status: 'SEARCHING' | 'REQUEST_PENDING' | 'HOSPITAL_ACCEPTED' | 'CLOSED' | string;
  createdAt: string;
  updatedAt?: string;
  assignedAmbulanceCallSign?: string;
  assignedAmbulanceState?: 'AVAILABLE_STANDBY' | 'EN_ROUTE_TO_SCENE' | 'PATIENT_ON_BOARD' | 'AT_HOSPITAL' | 'MAINTENANCE' | 'DISPATCHED' | string;
  ambulanceUnitType?: 'ALS' | 'BLS' | 'NEONATAL';
  targetHospitalId?: string;
  targetHospitalName?: string;
  etaMinutes?: number;
  paramedicName?: string;
}

export interface CoordinationRequest {
  id: string;
  caseId: string;
  hospitalId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
  distanceKm: number;
  createdAt: string;
  respondedAt?: string;
  rejectionReason?: string;
}

export interface HospitalRecommendation {
  hospital: Hospital;
  eligible: boolean;
  exclusionReasons: string[];
  distanceKm: number;
  distanceMethod?: string;
  score: number;
  freshness: string;
  rankingExplanation: string;
}

export interface AdminOverview {
  totalHospitals: number;
  openHospitals: number;
  intakeEnabled: number;
  activeCases: number;
  pendingRequests: number;
  acceptedRequests: number;
  events: Array<{
    id: string;
    type: string;
    summary: string;
    timestamp: string;
  }>;
  requests: CoordinationRequest[];
}

export type UserRole = 'Ambulance Operator' | 'Hospital Staff' | 'Administrator';

export interface AmbulanceUnit {
  id: string;
  callSign: string;
  vehicleNumber: string;
  model: string;
  type: 'ALS' | 'BLS' | 'NEONATAL';
  baseStation: string;
  region: 'NAMAKKAL' | 'ERODE';
  status: 'AVAILABLE_STANDBY' | 'EN_ROUTE_TO_SCENE' | 'PATIENT_ON_BOARD' | 'AT_HOSPITAL' | 'MAINTENANCE';
  latitude: number;
  longitude: number;
  pilotName: string;
  pilotPhone: string;
  paramedicName: string;
  paramedicPhone: string;
  fuelLevelPercent: number;
  oxygenTankPercent: number;
  batteryPercent: number;
  equipment: string[];
  assignedCaseNumber?: string;
  lastTriageAt: string;
}
