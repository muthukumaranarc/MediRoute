import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Check,
  AlertCircle,
  LocateFixed,
  LoaderCircle
} from 'lucide-react';
import { api, DEMO_MODE } from '../api';
import {
  CONDITION_CATEGORIES,
  resolveRegionalCoordinates
} from '../conditionCategories';

interface Props {
  refresh: () => void;
  flash: (msg: string) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Tiruchengode New Bus Stand', lat: 11.3792, lon: 77.8950 },
  { name: 'Kumarapalayam NH 544 Toll', lat: 11.4420, lon: 77.7210 },
  { name: 'Namakkal Bus Stand', lat: 11.2185, lon: 78.1650 },
  { name: 'Erode Central Bus Stand', lat: 11.3410, lon: 77.7172 },
  { name: 'Perundurai Medical Hub', lat: 11.2785, lon: 77.5835 },
  { name: 'Elayampalayam Vivekanandha Jn', lat: 11.3542, lon: 77.9298 },
  { name: 'Pallipalayam Cauvery Bridge', lat: 11.3600, lon: 77.7400 },
  { name: 'Paramathi Velur NH 7', lat: 11.0850, lon: 78.0100 }
];

type LocationMode = 'current' | 'preset' | 'manual';

export const NewCaseView: React.FC<Props> = ({ refresh, flash }) => {
  const navigate = useNavigate();

  const [condition, setCondition] = useState('');
  const [locationMode, setLocationMode] = useState<LocationMode>('manual');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');

  // Auto-detect current GPS location silently on mount if permission is already granted
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = Number(position.coords.latitude.toFixed(6));
        const currentLon = Number(position.coords.longitude.toFixed(6));
        setLat(currentLat);
        setLon(currentLon);
        setLocationMode('current');
        setAddress(`Current Location (${currentLat.toFixed(4)}, ${currentLon.toFixed(4)})`);
        setLocationMessage(
          `Current GPS location ready (±${Math.round(position.coords.accuracy)} m).`
        );
      },
      () => {
        // Leave input clean so operator can pick Current Location, a landmark, or type an area
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        'Device GPS is unavailable in this browser. Select a nearby landmark or type the pickup area.'
      );
      return;
    }
    setIsLocating(true);
    setLocationMessage('');
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = Number(position.coords.latitude.toFixed(6));
        const currentLon = Number(position.coords.longitude.toFixed(6));
        setLat(currentLat);
        setLon(currentLon);
        setLocationMode('current');
        setAddress(`Current Location (${currentLat.toFixed(4)}, ${currentLon.toFixed(4)})`);
        setLocationMessage(
          `Current GPS location captured (±${Math.round(position.coords.accuracy)} m).`
        );
        setIsLocating(false);
      },
      (geoError) => {
        setLocationMessage(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location access was denied. Pick a landmark below or type your pickup area.'
            : 'Could not lock GPS right now. Pick a landmark below or type your pickup area.'
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLocationPreset = (loc: (typeof PRESET_LOCATIONS)[number]) => {
    setLat(loc.lat);
    setLon(loc.lon);
    setLocationMode('preset');
    setAddress(loc.name);
    setLocationMessage('');
    setError('');
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setLocationMode('manual');
    setLat(null);
    setLon(null);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setError('Please select Current Location, pick a landmark, or type the pickup location.');
      return;
    }
    if (!condition) {
      setError('Please choose a patient condition category.');
      return;
    }

    const selectedCategory = CONDITION_CATEGORIES.find((c) => c.id === condition);
    const resolvedCoords =
      lat !== null && lon !== null
        ? { lat, lon }
        : resolveRegionalCoordinates(trimmedAddress);

    setIsSubmitting(true);
    try {
      const newCase = await api.createCase({
        conditionCategory: condition,
        pickupLatitude: resolvedCoords.lat,
        pickupLongitude: resolvedCoords.lon,
        displayAddress: trimmedAddress,
        requiredServices: selectedCategory?.defaultServices ?? ['GENERAL_EMERGENCY'],
        requiredEquipment: selectedCategory?.defaultEquipment ?? ['OXYGEN']
      });

      await refresh();
      flash(`✓ Case ${newCase.caseNumber} created! Showing live route & matching hospitals.`);
      navigate(`/ambulance/cases/${newCase.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryCategories = CONDITION_CATEGORIES.slice(0, -1);
  const otherCategory = CONDITION_CATEGORIES[CONDITION_CATEGORIES.length - 1];
  const OtherIcon = otherCategory.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/ambulance"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
          Quick 2-Step Dispatch
        </span>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <span>108 EMERGENCY DISPATCH</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            New Emergency Case
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {DEMO_MODE
              ? 'Choose the pickup point and patient condition to match demo facilities and activate live tracking.'
              : 'Choose the pickup location and patient condition to immediately match eligible hospitals.'}
          </p>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* 1. Pickup Location */}
          <div>
            <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block mb-2.5">
              1. Pickup Location <span className="text-rose-500">*</span>
            </label>

            {/* Quick Location Chips including Current Location */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  locationMode === 'current'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {isLocating ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5" />
                )}
                <span>{isLocating ? 'Getting Current Location…' : 'Use Current Location'}</span>
                {locationMode === 'current' && !isLocating && (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </button>

              {PRESET_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleLocationPreset(loc)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    locationMode === 'preset' && address === loc.name
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500 flex-none" />
                  <span>{loc.name}</span>
                </button>
              ))}
            </div>

            <input
              type="text"
              required
              placeholder="Or type pickup address, street, or landmark..."
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="input-field"
            />

            {locationMessage && (
              <p className="text-[11px] text-slate-500 mt-2 font-medium" role="status">
                {locationMessage}
              </p>
            )}
          </div>

          {/* 2. Patient Condition Category */}
          <div className="border-t border-slate-100 pt-6">
            <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block mb-1">
              2. Patient Condition Category <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Tap the condition that best describes the emergency.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {primaryCategories.map((c) => {
                const IconComponent = c.icon;
                const isSelected = condition === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCondition(c.id);
                      if (error) setError('');
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 text-left cursor-pointer ${
                      isSelected
                        ? `${c.selectedBorder} shadow-sm`
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${c.iconBg}`}
                    >
                      <IconComponent className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 leading-tight">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {c.hint} · {c.tamil}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-700 flex-none stroke-[3]" />
                    )}
                  </button>
                );
              })}

              {/* Full-width Other Medical Emergency catch-all */}
              <button
                type="button"
                onClick={() => {
                  setCondition(otherCategory.id);
                  if (error) setError('');
                }}
                className={`sm:col-span-2 p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 text-left cursor-pointer ${
                  condition === otherCategory.id
                    ? `${otherCategory.selectedBorder} shadow-sm`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${otherCategory.iconBg}`}
                >
                  <OtherIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 leading-tight">
                    {otherCategory.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {otherCategory.hint} · {otherCategory.tamil}
                  </div>
                </div>
                {condition === otherCategory.id && (
                  <Check className="w-4 h-4 text-emerald-700 flex-none stroke-[3]" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div className="border-t border-slate-100 pt-6 flex items-center justify-between gap-4">
            <Link to="/ambulance" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              <span>
                {isSubmitting ? 'Matching Hospitals...' : 'Find & Match Hospitals →'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
