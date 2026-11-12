import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital, HospitalRecommendation, Case } from '../types';
import { GMAP_KEY } from '../api';
import { getConditionCategoryInfo } from '../conditionCategories';
import {
  computeBearingDegrees,
  createDirectionArrowIcon,
  normalizeRecommendationsForCase
} from '../mapRouting';

interface Props {
  emergencyCase: Case;
  hospitals: Hospital[];
  recommendations: HospitalRecommendation[];
  selectedHospitalId?: string | null;
  onSelectHospital?: (hospitalId: string) => void;
}

export const DispatchMap: React.FC<Props> = ({
  emergencyCase,
  hospitals,
  recommendations,
  selectedHospitalId,
  onSelectHospital
}) => {
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const scaleAddedRef = useRef<boolean>(false);
  const previousRouteKeyRef = useRef<string>('');
  const onSelectHospitalRef = useRef(onSelectHospital);
  onSelectHospitalRef.current = onSelectHospital;

  // If a valid Google Maps API Key is configured in .env, render the full Google Maps view
  if (GMAP_KEY && GMAP_KEY.length > 5 && !GMAP_KEY.includes('YOUR_')) {
    return (
      <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-slate-200">
        <APIProvider apiKey={GMAP_KEY}>
          <Map
            defaultCenter={{ lat: emergencyCase.pickupLatitude, lng: emergencyCase.pickupLongitude }}
            defaultZoom={12}
            style={{ width: '100%', height: '100%' }}
            mapId="mediroute-map"
            gestureHandling="cooperative"
          >
            <AdvancedMarker
              position={{ lat: emergencyCase.pickupLatitude, lng: emergencyCase.pickupLongitude }}
              onClick={() => setActiveMarker('pickup')}
            >
              <Pin background="#e11d48" borderColor="#ffffff" glyphColor="#ffffff" glyph="🚑" />
            </AdvancedMarker>

            {activeMarker === 'pickup' && (
              <InfoWindow
                position={{ lat: emergencyCase.pickupLatitude, lng: emergencyCase.pickupLongitude }}
                onCloseClick={() => setActiveMarker(null)}
              >
                <div className="p-1 text-xs">
                  <strong className="text-slate-900">Ambulance Pickup</strong>
                  <p className="text-slate-500 mt-0.5">{emergencyCase.displayAddress}</p>
                </div>
              </InfoWindow>
            )}

            {hospitals.map(h => {
              const match = recommendations.find(x => x.hospital.id === h.id);
              const isEligible = match?.eligible;

              return (
                <AdvancedMarker
                  key={h.id}
                  position={{ lat: h.latitude, lng: h.longitude }}
                  onClick={() => setActiveMarker(h.id)}
                >
                  <Pin
                    background={isEligible ? '#059669' : '#94a3b8'}
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                    glyph="🏥"
                  />
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>
      </div>
    );
  }

  // Primary Standard: Leaflet OpenStreetMap (Crisp, light, identical to other pages)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [emergencyCase.pickupLatitude, emergencyCase.pickupLongitude],
        zoom: 12,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing marker/polyline layers
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const createAmbulanceIcon = (caseNum: string) => {
      return L.divIcon({
        className: 'custom-ambulance-marker',
        html: `
          <div style="display: flex; align-items: center; cursor: pointer;">
            <div style="background-color: #E11D48; color: white; padding: 4px 8px; border-radius: 8px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35); border: 2px solid white; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 14px;">🚑</span>
              <div style="line-height: 1.1;">
                <div style="font-size: 10px; font-weight: 800; letter-spacing: -0.2px;">Ambulance</div>
                <div style="font-size: 9px; font-weight: 600; opacity: 0.95;">${caseNum}</div>
              </div>
            </div>
          </div>
        `,
        iconSize: [110, 36],
        iconAnchor: [55, 18]
      });
    };

    const createSelectedHospitalIcon = (name: string, km: number) => {
      return L.divIcon({
        className: 'custom-selected-hospital-marker',
        html: `
          <div style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background-color: #10B981; border: 2px solid white; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
              📍
            </div>
            <div style="background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(4px); border: 1px solid #CBD5E1; padding: 4px 8px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); font-size: 10.5px; font-weight: 800; color: #0F172A; white-space: nowrap;">
              ${name} <span style="color: #64748B; font-weight: 600;">(${km.toFixed(1)} km)</span>
            </div>
          </div>
        `,
        iconSize: [260, 32],
        iconAnchor: [13, 16]
      });
    };

    const createOtherHospitalIcon = (name: string, km: number) => {
      const shortName = name
        .replace('Multi-Speciality Hospital', 'Hospital')
        .replace('Medical College Hospital', 'Medical College')
        .replace('Headquarters Hospital', 'Hospital')
        .replace(' (CMCH)', '');

      return L.divIcon({
        className: 'custom-other-hospital-marker',
        html: `
          <div style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #2563EB; border: 2px solid white; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 800;">
              +
            </div>
            <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); border: 1px solid #E2E8F0; padding: 3px 7px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); font-size: 10.5px; font-weight: 700; color: #1E293B; white-space: nowrap;">
              ${shortName} <span style="color: #64748B; font-weight: 500;">(${km.toFixed(1)} km)</span>
            </div>
          </div>
        `,
        iconSize: [220, 30],
        iconAnchor: [12, 15]
      });
    };

    // 1. Ambulance Position uses the case's pickup coordinates
    const ambulancePos: [number, number] = [emergencyCase.pickupLatitude, emergencyCase.pickupLongitude];
    const categoryInfo = getConditionCategoryInfo(emergencyCase.conditionCategory);

    const ambMarker = L.marker(ambulancePos, {
      icon: createAmbulanceIcon(emergencyCase.caseNumber),
      zIndexOffset: 1200
    }).addTo(map);

    ambMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; padding: 6px;">
        <strong style="color: #E11D48; font-size: 13px;">🚑 Ambulance Pickup</strong>
        <p style="margin: 4px 0; color: #0F172A; font-weight: 700;">Case: ${emergencyCase.caseNumber} · ${categoryInfo.name}</p>
        <p style="margin: 2px 0; color: #475569;">${emergencyCase.displayAddress}</p>
        <small style="color: #059669; font-weight: 700; display: block; margin-top: 4px;">Lat: ${ambulancePos[0].toFixed(4)}, Lng: ${ambulancePos[1].toFixed(4)}</small>
      </div>
    `);

    const bounds = L.latLngBounds([ambulancePos]);

    // 2. Normalize recommendations so >= 1 nearest hospital is always available & selected by default
    const normalizedRecs = normalizeRecommendationsForCase(emergencyCase, hospitals, recommendations);
    const eligibleRecs = normalizedRecs.filter(r => r.eligible);
    const selectedRec =
      (selectedHospitalId && normalizedRecs.find(r => r.hospital.id === selectedHospitalId)) ||
      eligibleRecs[0] ||
      normalizedRecs[0];

    // 3. Plot selected destination + nearest alternative network options
    const plottedRecs: HospitalRecommendation[] = [];
    if (selectedRec) plottedRecs.push(selectedRec);
    for (const rec of eligibleRecs) {
      if (plottedRecs.length >= 4) break;
      if (!plottedRecs.some(item => item.hospital.id === rec.hospital.id)) {
        plottedRecs.push(rec);
      }
    }

    plottedRecs.forEach(rec => {
      const h = rec.hospital;
      const isTopSelected = selectedRec && selectedRec.hospital.id === h.id;
      const dist = rec.distanceKm;

      let icon: L.DivIcon;
      if (isTopSelected) {
        icon = createSelectedHospitalIcon(h.name, dist);
      } else {
        icon = createOtherHospitalIcon(h.name, dist);
      }

      const marker = L.marker([h.latitude, h.longitude], {
        icon,
        zIndexOffset: isTopSelected ? 1150 : 900
      }).addTo(map);

      const switchBtnHtml =
        !isTopSelected && onSelectHospitalRef.current
          ? `<button type="button" data-select-dispatch-hospital="${h.id}" style="margin-top: 6px; width: 100%; background: #059669; color: #ffffff; border: none; border-radius: 6px; padding: 5px 8px; font-size: 11px; font-weight: 700; cursor: pointer;">Set as Destination</button>`
          : '';

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 4px; min-width: 185px;">
          <strong style="color: #0F172A; font-size: 13px;">${h.name}</strong>
          <p style="margin: 4px 0; color: #475569;">${h.address}</p>
          <p style="margin: 2px 0; font-weight: 700; color: #059669;">
            ✓ ${h.availableEmergencyBeds} Beds Ready (${h.operationalStatus})
          </p>
          <p style="margin: 2px 0; color: #64748B; font-size: 11px;">Distance: ${rec.distanceKm.toFixed(1)} km · Match ${rec.score}%</p>
          ${switchBtnHtml}
        </div>
      `);

      marker.on('popupopen', (evt) => {
        const el = (evt as L.PopupEvent).popup?.getElement();
        const btn = el?.querySelector('[data-select-dispatch-hospital]');
        if (btn) {
          btn.addEventListener('click', () => {
            onSelectHospitalRef.current?.(h.id);
            map.closePopup();
          });
        }
      });

      bounds.extend([h.latitude, h.longitude]);
    });

    // 4. Draw dashed red route line and direction arrow from pickup position to selected destination
    if (selectedRec) {
      const topH = selectedRec.hospital;
      const routeCoords: L.LatLngExpression[] = [
        ambulancePos,
        [topH.latitude, topH.longitude]
      ];

      L.polyline(routeCoords, {
        color: '#E11D48',
        weight: 3.5,
        dashArray: '6, 6',
        opacity: 0.95
      }).addTo(map);

      const midLat = (ambulancePos[0] + topH.latitude) / 2;
      const midLon = (ambulancePos[1] + topH.longitude) / 2;
      const bearing = computeBearingDegrees(ambulancePos[0], ambulancePos[1], topH.latitude, topH.longitude);
      L.marker([midLat, midLon], {
        icon: createDirectionArrowIcon(bearing, '#E11D48'),
        interactive: false,
        zIndexOffset: 1100
      }).addTo(map);
    }

    // Add scale bar once to bottom right
    if (!scaleAddedRef.current) {
      L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
      scaleAddedRef.current = true;
    }

    // Fit map bounds comfortably when case, selected hospital, or route first becomes available
    const routeKey = `${emergencyCase.id}:${selectedRec?.hospital.id || ''}`;
    if (bounds.isValid() && previousRouteKeyRef.current !== routeKey) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      previousRouteKeyRef.current = routeKey;
    }
  }, [emergencyCase, hospitals, recommendations, selectedHospitalId]);

  return (
    <div className="relative w-full h-[470px] rounded-xl overflow-hidden border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Legend (Bottom-Left as in Reference) */}
      <div 
        className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl flex flex-col gap-2.5 z-[1000] pointer-events-auto"
        style={{
          padding: '14px 18px',
          width: 'max-content'
        }}
      >
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
          <div className="w-5 flex items-center justify-center flex-none">
            <span className="w-4 h-4 rounded bg-[#E11D48] text-white text-[10px] flex items-center justify-center font-bold shadow-xs">🚑</span>
          </div>
          <span className="text-rose-700 font-bold">Ambulance Pickup</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
          <div className="w-5 flex items-center justify-center flex-none">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-[#E11D48]" />
          </div>
          <span>Recommended Route</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
          <div className="w-5 flex items-center justify-center flex-none">
            <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] flex items-center justify-center text-white text-[9px]">📍</span>
          </div>
          <span>Selected Hospital</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
          <div className="w-5 flex items-center justify-center flex-none">
            <span className="w-3.5 h-3.5 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[10px] font-bold">+</span>
          </div>
          <span>Other Eligible Hospital</span>
        </div>
      </div>
    </div>
  );
};
