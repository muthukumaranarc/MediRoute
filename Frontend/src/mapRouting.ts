import L from 'leaflet';
import type { Case, CoordinationRequest, Hospital, HospitalRecommendation } from './types';

const TERMINAL_STATUSES = new Set(['CLOSED', 'COMPLETED', 'CANCELLED']);
const DRIVER_DEST_STORAGE_KEY = 'mediroute_driver_destinations_v1';
export const DESTINATION_CHANGE_EVENT = 'mediroute-destination-changed';

export interface ResolvedDestination {
  hospital: Hospital;
  mode: 'CONFIRMED' | 'PENDING' | 'ASSIGNED' | 'RECOMMENDED';
  statusLabel: string;
  distanceKm: number;
}

/**
 * Reads per-case driver destination overrides saved locally for cross-view sync.
 */
function readDestinationOverrides(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(DRIVER_DEST_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function getStoredDriverDestinationId(caseId: string): string | null {
  if (!caseId) return null;
  const map = readDestinationOverrides();
  return typeof map[caseId] === 'string' && map[caseId] ? map[caseId] : null;
}

export function setStoredDriverDestinationId(caseId: string, hospitalId: string | null): void {
  if (!caseId) return;
  try {
    if (typeof localStorage !== 'undefined') {
      const map = readDestinationOverrides();
      if (hospitalId) {
        map[caseId] = hospitalId;
      } else {
        delete map[caseId];
      }
      localStorage.setItem(DRIVER_DEST_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore storage quota / restricted storage errors
  }

  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DESTINATION_CHANGE_EVENT, { detail: { caseId, hospitalId } }));
  }
}

/**
 * Returns true only for newly logged cases (non-demo fixture) that are still active.
 */
export function isLiveNewCase(c: Case): boolean {
  if (!c || !c.id) return false;
  if (c.id.startsWith('case-demo-')) return false;
  const status = (c.status || '').toUpperCase();
  return !TERMINAL_STATUSES.has(status);
}

/**
 * Returns active newly created cases sorted newest first.
 */
export function getActiveNewCases(cases: Case[]): Case[] {
  return cases
    .filter(isLiveNewCase)
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
}

export function haversineDistanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function computeBearingDegrees(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): number {
  const rad = Math.PI / 180;
  const dLon = (toLon - fromLon) * rad;
  const lat1 = fromLat * rad;
  const lat2 = toLat * rad;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Normalizes recommendations so eligible hospitals are sorted nearest-first and every
 * case always has at least one recommended hospital whenever network hospitals exist.
 */
export function normalizeRecommendationsForCase(
  emergencyCase: Case,
  hospitals: Hospital[],
  rawRecs: HospitalRecommendation[] = []
): HospitalRecommendation[] {
  if (!emergencyCase) return [];

  const reqServices = emergencyCase.requiredServices || [];
  const reqEquipment = emergencyCase.requiredEquipment || [];

  const baseRecs: HospitalRecommendation[] =
    rawRecs.length > 0
      ? rawRecs.map((rec) => {
          const km =
            typeof rec.distanceKm === 'number' && !Number.isNaN(rec.distanceKm)
              ? Math.round(rec.distanceKm * 10) / 10
              : Math.round(
                  haversineDistanceKm(
                    emergencyCase.pickupLatitude,
                    emergencyCase.pickupLongitude,
                    rec.hospital.latitude,
                    rec.hospital.longitude
                  ) * 10
                ) / 10;
          return { ...rec, distanceKm: km };
        })
      : hospitals.map((h) => {
          const reasons: string[] = [];
          if (h.operationalStatus !== 'OPEN') reasons.push('Hospital is closed');
          if (!h.emergencyIntakeEnabled) reasons.push('Emergency intake is disabled');
          if (h.availableEmergencyBeds < 1) reasons.push('No available emergency beds');
          const missingServices = reqServices.filter((s) => !(h.services || []).includes(s));
          if (missingServices.length) {
            reasons.push(`Missing required service(s): ${missingServices.join(', ')}`);
          }
          const missingEquip = reqEquipment.filter((eq) => !(h.equipment || []).includes(eq));
          if (missingEquip.length) {
            reasons.push(`Missing required equipment: ${missingEquip.join(', ')}`);
          }
          const km =
            Math.round(
              haversineDistanceKm(
                emergencyCase.pickupLatitude,
                emergencyCase.pickupLongitude,
                h.latitude,
                h.longitude
              ) * 10
            ) / 10;
          const strictOk = reasons.length === 0;
          const rawScore =
            0.6 * Math.max(0, 100 - km * 5) +
            0.25 * Math.min(100, h.availableEmergencyBeds * 10) +
            0.15 * 100;
          return {
            hospital: h,
            eligible: strictOk,
            exclusionReasons: reasons,
            distanceKm: km,
            distanceMethod: 'HAVERSINE_STRAIGHT_LINE',
            score: strictOk ? Math.round(rawScore * 10) / 10 : 0,
            freshness: 'FRESH',
            rankingExplanation: 'Ranked nearest first with capacity and capability readiness.'
          };
        });

  if (baseRecs.length === 0) return [];

  const strictEligible = baseRecs.filter((r) => r.eligible);
  if (strictEligible.length > 0) {
    const sortedEligible = [...strictEligible].sort(
      (a, b) =>
        a.distanceKm - b.distanceKm ||
        b.score - a.score ||
        b.hospital.availableEmergencyBeds - a.hospital.availableEmergencyBeds
    );
    const sortedExcluded = baseRecs
      .filter((r) => !r.eligible)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return [...sortedEligible, ...sortedExcluded];
  }

  // Fallback cascade: always surface at least 1 (up to 4 nearest) hospitals
  let tier = baseRecs.filter(
    (r) =>
      r.hospital.operationalStatus === 'OPEN' &&
      r.hospital.emergencyIntakeEnabled &&
      r.hospital.availableEmergencyBeds > 0 &&
      reqServices.every((s) => (r.hospital.services || []).includes(s))
  );
  if (tier.length === 0) {
    tier = baseRecs.filter(
      (r) => r.hospital.operationalStatus === 'OPEN' && r.hospital.availableEmergencyBeds > 0
    );
  }
  if (tier.length === 0) {
    tier = baseRecs.filter((r) => r.hospital.operationalStatus === 'OPEN');
  }
  if (tier.length === 0) {
    tier = baseRecs;
  }

  const promotedIds = new Set(
    [...tier]
      .sort(
        (a, b) =>
          a.distanceKm - b.distanceKm ||
          b.hospital.availableEmergencyBeds - a.hospital.availableEmergencyBeds
      )
      .slice(0, 4)
      .map((r) => r.hospital.id)
  );

  return baseRecs
    .map((r) => {
      if (!promotedIds.has(r.hospital.id)) return r;
      const fallbackScore =
        Math.round(
          Math.max(
            10,
            0.6 * Math.max(0, 100 - r.distanceKm * 5) +
              0.25 * Math.min(100, r.hospital.availableEmergencyBeds * 10) +
              0.15 * 50
          ) * 10
        ) / 10;
      return {
        ...r,
        eligible: true,
        exclusionReasons: [],
        score: r.score > 0 ? r.score : fallbackScore,
        rankingExplanation: 'Nearest available emergency hospital fallback (sorted closest first).'
      };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        a.distanceKm - b.distanceKm ||
        b.hospital.availableEmergencyBeds - a.hospital.availableEmergencyBeds
    );
}

/**
 * Resolves the destination hospital for an active emergency case:
 * 1) Accepted coordination request
 * 2) Driver-selected hospital override (local or persisted targetHospitalId)
 * 3) Pending coordination request
 * 4) Persisted targetHospitalName
 * 5) Nearest eligible/fallback hospital (default)
 */
export function resolveDestinationHospital(
  emergencyCase: Case,
  hospitals: Hospital[],
  requests: CoordinationRequest[] = [],
  rawRecs: HospitalRecommendation[] = []
): ResolvedDestination | null {
  const normalized = normalizeRecommendationsForCase(emergencyCase, hospitals, rawRecs);
  const allHospitals = hospitals.length > 0 ? hospitals : normalized.map((r) => r.hospital);
  if (!emergencyCase || allHospitals.length === 0) return null;

  const findDistance = (hosp: Hospital) =>
    Math.round(
      haversineDistanceKm(
        emergencyCase.pickupLatitude,
        emergencyCase.pickupLongitude,
        hosp.latitude,
        hosp.longitude
      ) * 10
    ) / 10;

  const caseRequests = requests.filter((r) => r.caseId === emergencyCase.id);

  const acceptedReq = caseRequests.find((r) => r.status === 'ACCEPTED');
  if (acceptedReq) {
    const hosp = allHospitals.find((h) => h.id === acceptedReq.hospitalId);
    if (hosp) {
      return {
        hospital: hosp,
        mode: 'CONFIRMED',
        statusLabel: 'Confirmed Destination',
        distanceKm: findDistance(hosp)
      };
    }
  }

  const storedDestId = getStoredDriverDestinationId(emergencyCase.id);
  const driverChosenId = storedDestId || emergencyCase.targetHospitalId;
  if (driverChosenId) {
    const hosp = allHospitals.find((h) => h.id === driverChosenId);
    if (hosp) {
      return {
        hospital: hosp,
        mode: 'ASSIGNED',
        statusLabel: 'Selected Destination',
        distanceKm: findDistance(hosp)
      };
    }
  }

  const pendingReq = caseRequests.find((r) => r.status === 'PENDING');
  if (pendingReq) {
    const hosp = allHospitals.find((h) => h.id === pendingReq.hospitalId);
    if (hosp) {
      return {
        hospital: hosp,
        mode: 'PENDING',
        statusLabel: 'Requested Destination',
        distanceKm: findDistance(hosp)
      };
    }
  }

  if (emergencyCase.targetHospitalName) {
    const targetLower = emergencyCase.targetHospitalName.toLowerCase();
    const hosp = allHospitals.find((h) => h.name.toLowerCase().includes(targetLower));
    if (hosp) {
      return {
        hospital: hosp,
        mode: 'ASSIGNED',
        statusLabel: 'Assigned Destination',
        distanceKm: findDistance(hosp)
      };
    }
  }

  const nearest = normalized.find((r) => r.eligible) || normalized[0];
  if (!nearest) return null;

  return {
    hospital: nearest.hospital,
    mode: 'RECOMMENDED',
    statusLabel: 'Nearest Hospital',
    distanceKm: nearest.distanceKm
  };
}

export function createDirectionArrowIcon(bearingDeg: number, color = '#E11D48'): L.DivIcon {
  return L.divIcon({
    className: 'custom-direction-arrow',
    html: `
      <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div style="width: 22px; height: 22px; border-radius: 50%; background: #ffffff; border: 2px solid ${color}; box-shadow: 0 2px 6px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; transform: rotate(${bearingDeg.toFixed(1)}deg);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="${color}">
            <path d="M12 2L20 20L12 16L4 20L12 2Z" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}
