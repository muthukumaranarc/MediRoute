import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital, Case, CoordinationRequest } from '../types';
import {
  DESTINATION_CHANGE_EVENT,
  computeBearingDegrees,
  createDirectionArrowIcon,
  getActiveNewCases,
  resolveDestinationHospital
} from '../mapRouting';

interface LiveResponseMapProps {
  cases?: Case[];
  hospitals?: Hospital[];
  requests?: CoordinationRequest[];
}

export const LiveResponseMap: React.FC<LiveResponseMapProps> = ({
  cases = [],
  hospitals = [],
  requests = []
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [destVersion, setDestVersion] = useState(0);

  useEffect(() => {
    const onDestChange = () => setDestVersion((v) => v + 1);
    window.addEventListener(DESTINATION_CHANGE_EVENT, onDestChange);
    return () => window.removeEventListener(DESTINATION_CHANGE_EVENT, onDestChange);
  }, []);

  const activeNewCases = useMemo(() => getActiveNewCases(cases), [cases]);
  const activeCase = activeNewCases[0] || null;
  const destination = useMemo(
    () => (activeCase ? resolveDestinationHospital(activeCase, hospitals, requests) : null),
    [activeCase, hospitals, requests, destVersion]
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [11.22, 77.56],
        zoom: 9,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: !L.Browser.mobile
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous vector layers (except TileLayer)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const coimbatorePos: [number, number] = [11.0168, 76.9558];
    const erodePos: [number, number] = [11.3410, 77.7172];
    const namakkalPos: [number, number] = [11.2189, 78.1674];

    const createHospitalIcon = (cityName: string) =>
      L.divIcon({
        className: 'custom-h-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); pointer-events: auto;">
            <span style="font-weight: 800; font-size: 11px; color: #0f172a; margin-bottom: 2px; text-shadow: 0 1px 3px rgba(255,255,255,0.95); white-space: nowrap;">${cityName}</span>
            <div style="width: 22px; height: 22px; background-color: #2563eb; color: #ffffff; font-weight: 900; font-size: 11.5px; display: flex; align-items: center; justify-content: center; border-radius: 5px; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              H
            </div>
          </div>
        `,
        iconSize: [60, 42],
        iconAnchor: [30, 21]
      });

    L.marker(coimbatorePos, { icon: createHospitalIcon('Coimbatore') }).addTo(map);
    L.marker(erodePos, { icon: createHospitalIcon('Erode') }).addTo(map);
    L.marker(namakkalPos, { icon: createHospitalIcon('Namakkal') }).addTo(map);

    const createAmbulanceIcon = () =>
      L.divIcon({
        className: 'custom-amb-route-marker',
        html: `
          <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 2px 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.2); transform: translate(-50%, -50%);">
            <span style="font-size: 13px;">🚑</span>
          </div>
        `,
        iconSize: [28, 24],
        iconAnchor: [14, 12]
      });

    L.marker([11.31, 77.62], { icon: createAmbulanceIcon() }).addTo(map);
    L.marker([11.32, 77.78], { icon: createAmbulanceIcon() }).addTo(map);
    L.marker([11.35, 78.02], { icon: createAmbulanceIcon() }).addTo(map);

    if (activeCase && destination) {
      const originPos: [number, number] = [activeCase.pickupLatitude, activeCase.pickupLongitude];
      const destHospital = destination.hospital;
      const destPos: [number, number] = [destHospital.latitude, destHospital.longitude];

      const shortDestName = destHospital.name
        .replace('Govt Medical College Hospital', 'GMCH')
        .replace('Government Medical College Hospital', 'GMCH')
        .replace('Govt Headquarters Hospital', 'Govt HQ')
        .replace('Government Headquarters Hospital', 'Govt HQ')
        .replace('Multi-Speciality Hospital', 'Hospital')
        .replace('Multi Speciality Hospital', 'Hospital')
        .replace('Government Hospital', 'GH')
        .replace('Medical Care Hospital', 'Hospital');

      const createEmergencyBeacon = (label: string) =>
        L.divIcon({
          className: 'custom-emergency-beacon',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 90px; height: 80px; transform: translate(-50%, -50%);">
              <div style="position: absolute; width: 58px; height: 58px; border-radius: 50%; background: rgba(239, 68, 68, 0.22); border: 2px solid rgba(239, 68, 68, 0.5); animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(239, 68, 68, 0.35);"></div>
              <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
              <span style="position: absolute; bottom: 2px; font-weight: 800; font-size: 10px; background: rgba(255,255,255,0.92); padding: 1px 5px; border-radius: 4px; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.18); white-space: nowrap;">${label}</span>
            </div>
          `,
          iconSize: [90, 80],
          iconAnchor: [45, 40]
        });

      const createDestinationIcon = (label: string) =>
        L.divIcon({
          className: 'custom-dashboard-destination',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
              <div style="background: #064E3B; color: #ffffff; font-weight: 800; font-size: 9.5px; padding: 2px 6px; border-radius: 5px; white-space: nowrap; margin-bottom: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
                ${label}
              </div>
              <div style="width: 24px; height: 24px; background-color: #059669; color: #ffffff; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(5,150,105,0.45); font-size: 11px;">
                📍
              </div>
            </div>
          `,
          iconSize: [140, 44],
          iconAnchor: [70, 22]
        });

      L.marker(originPos, {
        icon: createEmergencyBeacon(activeCase.caseNumber),
        zIndexOffset: 1000
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-size: 11.5px;"><strong>${activeCase.caseNumber}</strong><br/>${activeCase.displayAddress}</div>`
        );

      L.marker(destPos, {
        icon: createDestinationIcon(shortDestName),
        zIndexOffset: 1100
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-size: 11.5px;"><strong>Destination: ${destHospital.name}</strong><br/>${destination.distanceKm.toFixed(1)} km · ${destHospital.availableEmergencyBeds} beds</div>`
        );

      L.polyline([originPos, destPos], {
        color: '#E11D48',
        weight: 3.5,
        dashArray: '7, 7',
        opacity: 0.92
      }).addTo(map);

      const midPos: [number, number] = [
        (originPos[0] + destPos[0]) / 2,
        (originPos[1] + destPos[1]) / 2
      ];
      const bearing = computeBearingDegrees(originPos[0], originPos[1], destPos[0], destPos[1]);
      L.marker(midPos, {
        icon: createDirectionArrowIcon(bearing, '#E11D48'),
        zIndexOffset: 1050,
        interactive: false
      }).addTo(map);

      map.fitBounds(L.latLngBounds([originPos, destPos]), { padding: [44, 44], maxZoom: 13 });
    } else {
      const corridorBounds: L.LatLngBoundsExpression = [
        [10.95, 76.82],
        [11.45, 78.25]
      ];
      map.fitBounds(corridorBounds, { padding: [16, 16] });
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => clearTimeout(timer);
  }, [activeCase, destination]);

  return (
    <div className="w-full">
      {/* Map Viewport */}
      <div className="relative w-full h-[255px] rounded-xl overflow-hidden border border-slate-100 bg-[#f8fafc]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      {/* Horizontal Bottom Legend Bar */}
      <div className="flex flex-wrap items-center justify-around gap-2 text-xs text-slate-600 font-medium pt-3 px-1">
        {activeCase && destination ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs ring-2 ring-red-200" />
              <span className="text-[11.5px] font-semibold text-slate-700">Active Case</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#E11D48]" />
              <span className="text-[11.5px] font-semibold text-slate-700">Direction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#059669] ring-2 ring-emerald-200" />
              <span className="text-[11.5px] font-semibold text-slate-700">Destination</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#2563eb] text-white text-[9.5px] font-black flex items-center justify-center">
                H
              </div>
              <span className="text-[11.5px] font-semibold text-slate-700">Hospital</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🚑</span>
              <span className="text-[11.5px] font-semibold text-slate-700">Ambulance (Live)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#2563eb] text-white text-[9.5px] font-black flex items-center justify-center">
                H
              </div>
              <span className="text-[11.5px] font-semibold text-slate-700">Hospital</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              No active new case route
            </span>
          </>
        )}
      </div>
    </div>
  );
};
