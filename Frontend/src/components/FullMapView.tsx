import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  MapPin,
  Plus,
  RotateCw,
  Compass,
  LocateFixed,
  Filter,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Case, CoordinationRequest, Hospital, AmbulanceUnit } from '../types';
import { FLEET_AMBULANCES } from '../fleetData';
import { api } from '../api';
import { getConditionCategoryInfo } from '../conditionCategories';
import {
  DESTINATION_CHANGE_EVENT,
  computeBearingDegrees,
  createDirectionArrowIcon,
  getActiveNewCases,
  normalizeRecommendationsForCase,
  resolveDestinationHospital,
  setStoredDriverDestinationId
} from '../mapRouting';

interface FullMapViewProps {
  cases: Case[];
  hospitals: Hospital[];
  requests?: CoordinationRequest[];
  refresh: () => Promise<void> | void;
  flash?: (msg: string) => void;
}

export const FullMapView: React.FC<FullMapViewProps> = ({
  cases,
  hospitals,
  requests = [],
  refresh,
  flash
}) => {
  const [searchParams] = useSearchParams();
  const requestedCaseId = searchParams.get('caseId');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(requestedCaseId);
  const [districtFilter, setDistrictFilter] = useState<'ALL' | 'NAMAKKAL' | 'ERODE'>('ALL');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [destVersion, setDestVersion] = useState<number>(0);
  const previousFilterRef = useRef<string>('ALL');
  const lastFittedActiveKeyRef = useRef<string>('');
  const hasCenteredOnUserRef = useRef<boolean>(false);

  useEffect(() => {
    const onDestChange = () => setDestVersion((v) => v + 1);
    window.addEventListener(DESTINATION_CHANGE_EVENT, onDestChange);
    return () => window.removeEventListener(DESTINATION_CHANGE_EVENT, onDestChange);
  }, []);

  const activeNewCases = useMemo(() => getActiveNewCases(cases), [cases]);

  const activeCase = useMemo(() => {
    if (activeNewCases.length === 0) return null;
    if (selectedCaseId) {
      const matched = activeNewCases.find((c) => c.id === selectedCaseId);
      if (matched) return matched;
    }
    return activeNewCases[0];
  }, [activeNewCases, selectedCaseId]);

  const hospitalOptions = useMemo(() => {
    if (!activeCase) return [];
    return normalizeRecommendationsForCase(activeCase, hospitals, []).filter((r) => r.eligible);
  }, [activeCase, hospitals]);

  const destination = useMemo(() => {
    if (!activeCase) return null;
    return resolveDestinationHospital(activeCase, hospitals, requests);
  }, [activeCase, hospitals, requests, destVersion]);

  const handleChangeDestination = async (hospitalId: string | null) => {
    if (!activeCase) return;
    setStoredDriverDestinationId(activeCase.id, hospitalId);
    setDestVersion((v) => v + 1);
    const target = hospitalId ? hospitals.find((h) => h.id === hospitalId) : hospitalOptions[0]?.hospital;
    if (hospitalId) {
      try {
        await api.updateCaseDestination(activeCase.id, hospitalId);
        await refresh();
      } catch {
        // Keep local driver selection if backend isn't restarted yet
      }
      if (target) {
        flash?.(`✓ Route destination updated to ${target.name}`);
      }
    } else if (target) {
      flash?.(`✓ Route reset to nearest hospital: ${target.name}`);
    }
  };

  const handleChangeDestRef = useRef(handleChangeDestination);
  handleChangeDestRef.current = handleChangeDestination;

  useEffect(() => {
    if (requestedCaseId && activeNewCases.some((c) => c.id === requestedCaseId)) {
      setSelectedCaseId(requestedCaseId);
    }
  }, [requestedCaseId, activeNewCases]);

  // Fetch browser GPS for "Locate Me" without inventing a fake active dispatch
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          if (mapInstanceRef.current && !activeCase && !hasCenteredOnUserRef.current) {
            hasCenteredOnUserRef.current = true;
            mapInstanceRef.current.setView(loc, 12);
          }
        },
        () => {
          // Keep null if GPS permission denied or unavailable
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [activeCase]);

  const handleLocateMe = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(loc, 14);
          }
          setIsLocating(false);
        },
        () => {
          const fallback: [number, number] = userLocation || [11.3792, 77.8950];
          mapInstanceRef.current?.setView(fallback, 12);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      mapInstanceRef.current?.setView(userLocation || [11.3792, 77.8950], 12);
      setIsLocating(false);
    }
  };

  const handleCompleteCase = async () => {
    if (!activeCase) return;
    setIsCompleting(true);
    try {
      await api.updateCaseStatus(activeCase.id, 'COMPLETED');
      await refresh();
      flash?.(`✓ Case ${activeCase.caseNumber} marked completed. Live route cleared.`);
    } catch (err) {
      flash?.((err as Error).message);
    } finally {
      setIsCompleting(false);
    }
  };

  const filteredHospitals = useMemo(
    () =>
      hospitals.filter((h) => {
        if (districtFilter === 'NAMAKKAL') {
          return (
            h.address.toLowerCase().includes('namakkal') ||
            h.address.toLowerCase().includes('tiruchengode') ||
            h.address.toLowerCase().includes('kumarapalayam') ||
            h.address.toLowerCase().includes('rasipuram') ||
            h.address.toLowerCase().includes('velur') ||
            h.id.includes('namakkal') ||
            h.id.includes('tiruchengode') ||
            h.id.includes('kumarapalayam') ||
            h.id.includes('rasipuram') ||
            h.id.includes('velur')
          );
        }
        if (districtFilter === 'ERODE') {
          return (
            h.address.toLowerCase().includes('erode') ||
            h.address.toLowerCase().includes('perundurai') ||
            h.address.toLowerCase().includes('bhavani') ||
            h.address.toLowerCase().includes('gobi') ||
            h.address.toLowerCase().includes('thindal') ||
            h.id.includes('erode') ||
            h.id.includes('perundurai') ||
            h.id.includes('bhavani') ||
            h.id.includes('gobi') ||
            h.id.includes('thindal')
          );
        }
        return true;
      }),
    [hospitals, districtFilter]
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter: [number, number] = activeCase
      ? [activeCase.pickupLatitude, activeCase.pickupLongitude]
      : userLocation || [11.35, 77.88];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 11,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous marker/polyline layers
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    const shortenHospitalName = (name: string) =>
      name
        .replace('Govt Medical College Hospital', 'GMCH')
        .replace('Government Medical College Hospital', 'GMCH')
        .replace('Namakkal Govt Medical College Hospital', 'GMCH Namakkal')
        .replace('Govt Headquarters Hospital', 'Govt HQ')
        .replace('Government Headquarters Hospital', 'Govt HQ')
        .replace('Multi-Speciality Hospital', 'Hospital')
        .replace('Multi Speciality Hospital', 'Hospital')
        .replace('Multispeciality Hospital & Cancer Centre', 'Cancer Centre')
        .replace('Government Hospital', 'GH')
        .replace('Medical Care Hospital', 'Hospital')
        .replace('& Research Institute', '')
        .replace('& Emergency Hospital', '')
        .replace('Emergency & Critical Care', '')
        .replace('Medical Center & Hospital', 'Hospital')
        .replace('Memorial Hospital', 'Memorial');

    const createHospitalIcon = (name: string, beds: number, district: string) => {
      const isErode = district === 'Erode';
      const bgColor = isErode ? '#0284c7' : '#1D4ED8';
      const shortName = shortenHospitalName(name);

      return L.divIcon({
        className: 'custom-hospital-marker',
        html: `
          <div class="relative flex items-center cursor-pointer">
            <div class="w-7 h-7 rounded-full text-white flex items-center justify-center shadow-md border-2 border-white text-xs font-bold z-10" style="background-color: ${bgColor};">
              🏥
            </div>
            <div class="ml-1 bg-white/95 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm border border-slate-200 whitespace-nowrap">
              ${shortName} <span class="font-bold text-emerald-600">(${beds}B)</span>
            </div>
          </div>
        `,
        iconSize: [140, 32],
        iconAnchor: [14, 16]
      });
    };

    const createDestinationHospitalIcon = (name: string, distKm: number, statusLabel: string) => {
      const shortName = shortenHospitalName(name);
      return L.divIcon({
        className: 'custom-destination-hospital-marker',
        html: `
          <div style="display: flex; align-items: center; cursor: pointer;">
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <span style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.28); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #059669; color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.45); border: 2.5px solid #ffffff; font-size: 14px; font-weight: 800; z-index: 10;">
                📍
              </div>
            </div>
            <div style="margin-left: 8px; background: #064E3B; color: #ffffff; padding: 4px 9px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.25); white-space: nowrap;">
              <div style="font-size: 8.5px; font-weight: 800; color: #6EE7B7; letter-spacing: 0.4px; text-transform: uppercase;">${statusLabel}</div>
              <div style="font-size: 10.5px; font-weight: 800;">${shortName} · ${distKm.toFixed(1)} km</div>
            </div>
          </div>
        `,
        iconSize: [240, 42],
        iconAnchor: [16, 21]
      });
    };

    const createActiveCaseIcon = (caseNum: string, conditionLabel: string) =>
      L.divIcon({
        className: 'custom-active-ambulance-marker',
        html: `
          <div class="relative flex items-center cursor-pointer group">
            <div class="relative flex items-center justify-center">
              <span class="absolute w-12 h-12 rounded-full bg-rose-500/30 animate-ping"></span>
              <span class="absolute w-9 h-9 rounded-full bg-rose-500/20"></span>
              <div class="w-9 h-9 rounded-full bg-[#E11D48] text-white flex items-center justify-center shadow-xl border-2 border-white text-base font-bold z-10 ring-4 ring-rose-400/50">
                🚑
              </div>
            </div>
            <div class="ml-2 bg-slate-900 text-white text-[10.5px] font-bold px-2.5 py-1 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap flex items-center gap-1.5">
              <span>${caseNum}</span>
              <span class="bg-rose-500 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded tracking-wide">${conditionLabel}</span>
            </div>
          </div>
        `,
        iconSize: [200, 48],
        iconAnchor: [20, 24]
      });

    const createUserGpsIcon = () =>
      L.divIcon({
        className: 'custom-user-gps-dot',
        html: `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <span style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(37, 99, 235, 0.25);"></span>
            <span style="width: 11px; height: 11px; border-radius: 50%; background: #2563EB; border: 2px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.35);"></span>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

    const createSmallAmbulanceIcon = (unit: AmbulanceUnit) => {
      let statusColor = '#10B981';
      if (unit.status === 'EN_ROUTE_TO_SCENE') statusColor = '#F59E0B';
      else if (unit.status === 'PATIENT_ON_BOARD') statusColor = '#E11D48';
      else if (unit.status === 'AT_HOSPITAL') statusColor = '#2563EB';
      else if (unit.status === 'MAINTENANCE') statusColor = '#64748B';

      const shortTag = unit.callSign.replace('TN-108-', '');

      return L.divIcon({
        className: 'custom-small-ambulance-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
            <div style="width: 22px; height: 22px; border-radius: 50%; background: ${statusColor}; color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 1.5px 5px rgba(0,0,0,0.32); border: 2px solid #ffffff; font-size: 11px; font-weight: bold;">
              🚑
            </div>
            <div style="font-size: 8.5px; font-weight: 800; background: rgba(15, 23, 42, 0.9); color: #ffffff; padding: 0.5px 4px; border-radius: 3px; white-space: nowrap; margin-top: 1px; box-shadow: 0 1px 3px rgba(0,0,0,0.25); border: 0.5px solid rgba(255,255,255,0.25);">
              ${shortTag}
            </div>
          </div>
        `,
        iconSize: [40, 32],
        iconAnchor: [20, 12]
      });
    };

    // 1. Optional subtle GPS dot when idle (not an emergency case)
    if (!activeCase && userLocation) {
      L.marker(userLocation, { icon: createUserGpsIcon(), zIndexOffset: 900 })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="color: #1D4ED8;">Your Current GPS Position</strong>
            <p style="margin: 2px 0; color: #64748B; font-size: 11px;">${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}</p>
          </div>`
        );
    }

    // 2. Plot fleet ambulances
    const filteredFleet = FLEET_AMBULANCES.filter((unit) => {
      if (districtFilter === 'NAMAKKAL') return unit.region === 'NAMAKKAL';
      if (districtFilter === 'ERODE') return unit.region === 'ERODE';
      return true;
    });

    filteredFleet.forEach((unit) => {
      if (
        activeCase &&
        Math.abs(unit.latitude - activeCase.pickupLatitude) < 0.0015 &&
        Math.abs(unit.longitude - activeCase.pickupLongitude) < 0.0015
      ) {
        return;
      }

      const marker = L.marker([unit.latitude, unit.longitude], {
        icon: createSmallAmbulanceIcon(unit),
        zIndexOffset: 950
      }).addTo(map);

      let statusBadgeHtml = `<span style="background: #ECFDF5; color: #047857; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #A7F3D0;">● Standby Available</span>`;
      if (unit.status === 'EN_ROUTE_TO_SCENE') {
        statusBadgeHtml = `<span style="background: #FFFBEB; color: #B45309; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #FDE68A;">● En Route to Scene</span>`;
      } else if (unit.status === 'PATIENT_ON_BOARD') {
        statusBadgeHtml = `<span style="background: #FFF1F2; color: #BE123C; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #FECDD3;">● Patient on Board</span>`;
      } else if (unit.status === 'AT_HOSPITAL') {
        statusBadgeHtml = `<span style="background: #EFF6FF; color: #1D4ED8; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #BFDBFE;">● At Hospital ER</span>`;
      } else if (unit.status === 'MAINTENANCE') {
        statusBadgeHtml = `<span style="background: #F1F5F9; color: #475569; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #CBD5E1;">● Maintenance</span>`;
      }

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 6px; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">🚑</span>
              <strong style="color: #0F172A; font-size: 13px;">${unit.callSign}</strong>
            </div>
            <span style="background: #0F172A; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px;">${unit.type}</span>
          </div>
          <div style="margin-bottom: 6px;">${statusBadgeHtml}</div>
          <p style="margin: 3px 0; color: #334155; font-size: 11px;"><strong>Base Station:</strong> ${unit.baseStation}</p>
          <p style="margin: 3px 0; color: #64748B; font-size: 10.5px;"><strong>Crew:</strong> ${unit.pilotName} (Pilot) · ${unit.paramedicName}</p>
        </div>
      `);

      bounds.extend([unit.latitude, unit.longitude]);
    });

    // 3. Plot network hospitals (skipping active destination hospital so its destination pin is clear)
    filteredHospitals.forEach((h) => {
      if (activeCase && destination && destination.hospital.id === h.id) {
        return;
      }

      const isErode =
        h.address.toLowerCase().includes('erode') ||
        h.address.toLowerCase().includes('perundurai') ||
        h.address.toLowerCase().includes('bhavani') ||
        h.address.toLowerCase().includes('gobi');
      const district = isErode ? 'Erode' : 'Namakkal';

      const marker = L.marker([h.latitude, h.longitude], {
        icon: createHospitalIcon(h.name, h.availableEmergencyBeds, district)
      }).addTo(map);

      const canChangeToHospital =
        activeCase &&
        destination &&
        destination.mode !== 'CONFIRMED' &&
        activeCase.status !== 'HOSPITAL_ACCEPTED';

      const switchButtonHtml = canChangeToHospital
        ? `<button type="button" data-select-live-hospital="${h.id}" style="margin-top: 6px; width: 100%; background: #059669; color: #ffffff; border: none; border-radius: 6px; padding: 5px 8px; font-size: 11px; font-weight: 700; cursor: pointer;">Set as Destination</button>`
        : '';

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 6px; min-width: 190px;">
          <strong style="color: #0F172A; font-size: 13px;">${h.name}</strong>
          <p style="margin: 4px 0; color: #475569; font-size: 11px;">${h.address}</p>
          <div style="margin: 4px 0; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 700; color: #059669; font-size: 12px;">✓ ${h.availableEmergencyBeds} Beds Ready</span>
            <span style="padding: 1px 5px; border-radius: 4px; background: #F1F5F9; color: #475569; font-size: 10px; font-weight: 600;">${district}</span>
          </div>
          ${switchButtonHtml}
        </div>
      `);

      marker.on('popupopen', (evt) => {
        const el = (evt as L.PopupEvent).popup?.getElement();
        const btn = el?.querySelector('[data-select-live-hospital]');
        if (btn) {
          btn.addEventListener('click', () => {
            handleChangeDestRef.current(h.id);
            map.closePopup();
          });
        }
      });

      bounds.extend([h.latitude, h.longitude]);
    });

    // 4. ONLY when a New Case is active: plot origin, destination point, and direction line + arrow
    if (activeCase && destination) {
      const originPos: [number, number] = [activeCase.pickupLatitude, activeCase.pickupLongitude];
      const destHospital = destination.hospital;
      const destPos: [number, number] = [destHospital.latitude, destHospital.longitude];
      const conditionInfo = getConditionCategoryInfo(activeCase.conditionCategory);

      const activeOriginMarker = L.marker(originPos, {
        icon: createActiveCaseIcon(activeCase.caseNumber, conditionInfo.shortName),
        zIndexOffset: 1300
      }).addTo(map);

      activeOriginMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 6px; min-width: 210px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 15px;">🚑</span>
            <strong style="color: #E11D48; font-size: 13px;">Active New Case Pickup</strong>
          </div>
          <p style="margin: 3px 0; color: #0F172A; font-weight: 700;">${activeCase.caseNumber} · ${conditionInfo.name}</p>
          <p style="margin: 2px 0; color: #475569; font-size: 11px;">${activeCase.displayAddress}</p>
          <p style="margin: 4px 0 0; color: #059669; font-size: 11px; font-weight: 700;">
            Destination: ${destHospital.name} (${destination.distanceKm.toFixed(1)} km)
          </p>
        </div>
      `);

      const destMarker = L.marker(destPos, {
        icon: createDestinationHospitalIcon(
          destHospital.name,
          destination.distanceKm,
          destination.statusLabel
        ),
        zIndexOffset: 1250
      }).addTo(map);

      destMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 6px; min-width: 210px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: #ECFDF5; color: #047857; font-weight: 800; font-size: 10px; margin-bottom: 4px;">
            ${destination.statusLabel.toUpperCase()}
          </span>
          <div style="font-weight: 800; color: #0F172A; font-size: 13px;">${destHospital.name}</div>
          <p style="margin: 3px 0; color: #475569; font-size: 11px;">${destHospital.address}</p>
          <div style="margin-top: 4px; font-weight: 700; color: #059669; font-size: 11.5px;">
            ✓ ${destHospital.availableEmergencyBeds} Beds Ready · ${destination.distanceKm.toFixed(1)} km away
          </div>
        </div>
      `);

      // Direction polyline
      L.polyline([originPos, destPos], {
        color: '#E11D48',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.92
      }).addTo(map);

      // Directional arrow at route midpoint pointing toward destination
      const midPos: [number, number] = [
        (originPos[0] + destPos[0]) / 2,
        (originPos[1] + destPos[1]) / 2
      ];
      const bearing = computeBearingDegrees(originPos[0], originPos[1], destPos[0], destPos[1]);
      L.marker(midPos, {
        icon: createDirectionArrowIcon(bearing, '#E11D48'),
        zIndexOffset: 1220,
        interactive: false
      }).addTo(map);

      const routeBounds = L.latLngBounds([originPos, destPos]);
      const activeKey = `${activeCase.id}:${destHospital.id}`;
      if (lastFittedActiveKeyRef.current !== activeKey) {
        map.fitBounds(routeBounds, { padding: [70, 70], maxZoom: 13 });
        lastFittedActiveKeyRef.current = activeKey;
      }
    } else {
      lastFittedActiveKeyRef.current = '';
      const filterChanged = previousFilterRef.current !== districtFilter;
      if (filterChanged && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
    previousFilterRef.current = districtFilter;
  }, [activeCase, destination, filteredHospitals, userLocation, districtFilter]);

  const activeConditionInfo = activeCase
    ? getConditionCategoryInfo(activeCase.conditionCategory)
    : null;

  return (
    <div className="overview-page-wrapper">
      {/* Header */}
      <div className="overview-header-row flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="overview-title text-xl sm:text-2xl">Regional Response Map</h1>
          <p className="overview-subtitle text-xs sm:text-sm">
            Live tracking {FLEET_AMBULANCES.length} fleet ambulances &amp; {filteredHospitals.length} network hospitals across Namakkal and Erode regions.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleLocateMe}
            className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-95 ${
              isLocating
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Center on my current GPS position"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : 'text-blue-600'}`} />
            <span>Locate Me</span>
          </button>
          <button
            type="button"
            onClick={() => refresh()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
          <Link to="/ambulance/new-case" className="btn-new-case text-xs py-2 px-3.5 active:scale-95">
            <Plus className="w-4 h-4" />
            <span>New case</span>
          </Link>
        </div>
      </div>

      {/* Active New Case Route Status Banner (or Standby notice) */}
      {activeCase && destination ? (
        <div className="mb-3 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse flex-none mt-1 sm:mt-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-slate-900">
                <span>Active Route: {activeCase.caseNumber}</span>
                {activeConditionInfo && (
                  <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${activeConditionInfo.badgeClass}`}>
                    {activeConditionInfo.shortName}
                  </span>
                )}
                <span className="text-emerald-700 font-bold">
                  · {destination.distanceKm.toFixed(1)} km ({destination.statusLabel})
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium truncate mt-0.5 flex items-center gap-1.5">
                <span className="truncate">{activeCase.displayAddress}</span>
                <ArrowRight className="w-3.5 h-3.5 text-rose-500 flex-none" />
                <span className="font-bold text-slate-800 truncate">{destination.hospital.name}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-none">
            {activeNewCases.length > 1 && (
              <select
                value={activeCase.id}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                aria-label="Select active new case"
              >
                {activeNewCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} · {getConditionCategoryInfo(c.conditionCategory).shortName}
                  </option>
                ))}
              </select>
            )}
            {hospitalOptions.length > 1 &&
              destination.mode !== 'CONFIRMED' &&
              activeCase.status !== 'HOSPITAL_ACCEPTED' && (
                <select
                  value={destination.hospital.id}
                  onChange={(e) => handleChangeDestination(e.target.value)}
                  className="bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 max-w-[260px] focus:outline-none"
                  aria-label="Change destination hospital"
                  title="Change destination hospital"
                >
                  {hospitalOptions.map((opt, idx) => (
                    <option key={opt.hospital.id} value={opt.hospital.id}>
                      {idx === 0 ? '★ Nearest: ' : `#${idx + 1}: `}
                      {opt.hospital.name} ({opt.distanceKm.toFixed(1)} km · {opt.hospital.availableEmergencyBeds}B)
                    </option>
                  ))}
                </select>
              )}
            {hospitalOptions.length > 0 &&
              destination.mode !== 'CONFIRMED' &&
              activeCase.status !== 'HOSPITAL_ACCEPTED' &&
              destination.hospital.id !== hospitalOptions[0].hospital.id && (
                <button
                  type="button"
                  onClick={() => handleChangeDestination(null)}
                  className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  title="Reset route destination to the nearest hospital"
                >
                  Nearest Default
                </button>
              )}
            <Link
              to={`/ambulance/cases/${activeCase.id}`}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors"
            >
              View Case
            </Link>
            <button
              type="button"
              disabled={isCompleting}
              onClick={handleCompleteCase}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isCompleting ? 'Closing...' : 'Complete Case'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-medium">
            <Navigation className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Standby view — no active new case. Destination &amp; direction will appear once a New Case is active.
            </span>
          </div>
          <Link to="/ambulance/new-case" className="font-bold text-emerald-700 hover:text-emerald-800">
            + Create New Case
          </Link>
        </div>
      )}

      {/* Regional Filter Bar */}
      <div className="flex items-center gap-2 mb-3 bg-white p-2 rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 px-2 flex-none">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Region:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDistrictFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              districtFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Hospitals ({hospitals.length})
          </button>
          <button
            type="button"
            onClick={() => setDistrictFilter('NAMAKKAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              districtFilter === 'NAMAKKAL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Namakkal Region (
            {
              hospitals.filter(
                (h) => !h.address.toLowerCase().includes('erode') && !h.id.includes('erode')
              ).length
            }
            )
          </button>
          <button
            type="button"
            onClick={() => setDistrictFilter('ERODE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              districtFilter === 'ERODE'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
            Erode Region (
            {
              hospitals.filter(
                (h) => h.address.toLowerCase().includes('erode') || h.id.includes('erode')
              ).length
            }
            )
          </button>
        </div>
      </div>

      {/* Main Map Card */}
      <section className="dashboard-card relative">
        <div className="relative w-full h-[480px] sm:h-[640px]">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Locate Me button on map */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="absolute bottom-5 right-5 z-[1000] p-3 rounded-full bg-white shadow-xl border border-slate-200 text-blue-600 hover:bg-blue-50 cursor-pointer active:scale-95 transition-transform"
            title="Jump to current GPS position"
          >
            <LocateFixed className="w-5 h-5 text-blue-600" />
          </button>

          {/* Map Overlay Controls / Legend */}
          <div
            className="mediroute-map-legend"
            style={{
              padding: '14px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid #e2e8f0'
            }}
          >
            <div
              className="mediroute-map-legend-header"
              style={{ paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}
            >
              <Compass className="w-4 h-4 text-emerald-600 flex-none" />
              <span>Network Map Legend</span>
            </div>

            {activeCase && destination ? (
              <>
                <div className="mediroute-map-legend-row">
                  <div className="mediroute-map-legend-icon-slot">
                    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E11D48] ring-2 ring-white" />
                    </span>
                  </div>
                  <span className="font-bold text-rose-700">Active Case Pickup</span>
                </div>
                <div className="mediroute-map-legend-row">
                  <div className="mediroute-map-legend-icon-slot">
                    <span className="w-3 h-3 rounded-full bg-[#059669] ring-2 ring-emerald-200" />
                  </div>
                  <span className="font-bold text-emerald-700">Destination Hospital</span>
                </div>
                <div className="mediroute-map-legend-row">
                  <div className="mediroute-map-legend-icon-slot">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-[#ef4444]" />
                  </div>
                  <span>Direction Route</span>
                </div>
              </>
            ) : (
              userLocation && (
                <div className="mediroute-map-legend-row">
                  <div className="mediroute-map-legend-icon-slot">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                  </div>
                  <span className="font-semibold text-blue-700">Your GPS Position</span>
                </div>
              )
            )}

            <div className="mediroute-map-legend-row">
              <div className="mediroute-map-legend-icon-slot">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-white shadow-xs" />
              </div>
              <span>Network Ambulances</span>
            </div>
            <div className="mediroute-map-legend-row">
              <div className="mediroute-map-legend-icon-slot">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8] ring-1 ring-white shadow-xs" />
              </div>
              <span>Namakkal Hospital</span>
            </div>
            <div className="mediroute-map-legend-row">
              <div className="mediroute-map-legend-icon-slot">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] ring-1 ring-white shadow-xs" />
              </div>
              <span>Erode Hospital</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
