import {
  HeartPulse,
  Car,
  Wind,
  Brain,
  Droplets,
  Zap,
  Baby,
  Flame,
  FlaskConical,
  Stethoscope,
  ShieldAlert,
  type LucideIcon
} from 'lucide-react';

export interface ConditionCategoryInfo {
  id: string;
  name: string;
  shortName: string;
  hint: string;
  tamil: string;
  icon: LucideIcon;
  iconBg: string;
  selectedBorder: string;
  badgeClass: string;
  defaultServices: string[];
  defaultEquipment: string[];
}

export const CONDITION_CATEGORIES: ConditionCategoryInfo[] = [
  {
    id: 'CARDIAC',
    name: 'Heart Attack / Chest Pain',
    shortName: 'Heart / Chest Pain',
    hint: 'Chest pain, palpitations',
    tamil: 'மாரடைப்பு / நெஞ்சு வலி',
    icon: HeartPulse,
    iconBg: 'bg-rose-100 text-rose-700',
    selectedBorder: 'border-rose-500 bg-rose-50/70 text-rose-950',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    defaultServices: ['CARDIAC', 'GENERAL_EMERGENCY'],
    defaultEquipment: ['ECG', 'DEFIBRILLATOR', 'OXYGEN']
  },
  {
    id: 'TRAUMA',
    name: 'Road Accident / Injury',
    shortName: 'Accident / Injury',
    hint: 'Crash, fall, fracture',
    tamil: 'சாலை விபத்து / காயம்',
    icon: Car,
    iconBg: 'bg-amber-100 text-amber-700',
    selectedBorder: 'border-amber-500 bg-amber-50/70 text-amber-950',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    defaultServices: ['TRAUMA', 'GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN', 'DEFIBRILLATOR']
  },
  {
    id: 'RESPIRATORY',
    name: 'Breathing Trouble',
    shortName: 'Breathing Trouble',
    hint: 'Asthma, choking, low O₂',
    tamil: 'மூச்சுத் திணறல்',
    icon: Wind,
    iconBg: 'bg-sky-100 text-sky-700',
    selectedBorder: 'border-sky-500 bg-sky-50/70 text-sky-950',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    defaultServices: ['RESPIRATORY', 'GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN', 'VENTILATOR']
  },
  {
    id: 'STROKE',
    name: 'Stroke / Paralysis',
    shortName: 'Stroke / Paralysis',
    hint: 'Face droop, slurred speech',
    tamil: 'பக்கவாதம்',
    icon: Brain,
    iconBg: 'bg-indigo-100 text-indigo-700',
    selectedBorder: 'border-indigo-500 bg-indigo-50/70 text-indigo-950',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    defaultServices: ['STROKE', 'GENERAL_EMERGENCY'],
    defaultEquipment: ['CT', 'VENTILATOR']
  },
  {
    id: 'BLEEDING',
    name: 'Heavy Bleeding',
    shortName: 'Heavy Bleeding',
    hint: 'Deep cut, blood loss',
    tamil: 'அதிக இரத்தப்போக்கு',
    icon: Droplets,
    iconBg: 'bg-red-100 text-red-700',
    selectedBorder: 'border-red-500 bg-red-50/70 text-red-950',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    defaultServices: ['TRAUMA', 'GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN']
  },
  {
    id: 'UNCONSCIOUS',
    name: 'Fainting / Seizure',
    shortName: 'Fainting / Fits',
    hint: 'Unconscious, fits',
    tamil: 'மயக்கம் / வலிப்பு',
    icon: Zap,
    iconBg: 'bg-violet-100 text-violet-700',
    selectedBorder: 'border-violet-500 bg-violet-50/70 text-violet-950',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    defaultServices: ['GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN', 'ECG']
  },
  {
    id: 'MATERNITY',
    name: 'Pregnancy / Delivery',
    shortName: 'Pregnancy / Labor',
    hint: 'Labor pain, maternity',
    tamil: 'பிரசவ அவசரம்',
    icon: Baby,
    iconBg: 'bg-pink-100 text-pink-700',
    selectedBorder: 'border-pink-500 bg-pink-50/70 text-pink-950',
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200',
    defaultServices: ['GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN']
  },
  {
    id: 'PEDIATRIC',
    name: 'Child / Baby Emergency',
    shortName: 'Child / Baby Care',
    hint: 'Infant or child urgent',
    tamil: 'குழந்தை அவசரம்',
    icon: ShieldAlert,
    iconBg: 'bg-teal-100 text-teal-700',
    selectedBorder: 'border-teal-500 bg-teal-50/70 text-teal-950',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    defaultServices: ['GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN']
  },
  {
    id: 'BURNS',
    name: 'Fire / Burn Injury',
    shortName: 'Burns / Fire',
    hint: 'Fire, scald, electric',
    tamil: 'தீக்காயம்',
    icon: Flame,
    iconBg: 'bg-orange-100 text-orange-700',
    selectedBorder: 'border-orange-500 bg-orange-50/70 text-orange-950',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    defaultServices: ['TRAUMA', 'GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN']
  },
  {
    id: 'POISONING',
    name: 'Poison / Snake Bite',
    shortName: 'Poison / Bite',
    hint: 'Snake bite, toxin, overdose',
    tamil: 'விஷம் / பாம்பு கடி',
    icon: FlaskConical,
    iconBg: 'bg-lime-100 text-lime-700',
    selectedBorder: 'border-lime-600 bg-lime-50/70 text-lime-950',
    badgeClass: 'bg-lime-50 text-lime-700 border-lime-200',
    defaultServices: ['GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN']
  },
  {
    id: 'GENERAL_EMERGENCY',
    name: 'Other Medical Emergency',
    shortName: 'Other Urgent',
    hint: 'High fever, sudden illness',
    tamil: 'பொது அவசர சிகிச்சை',
    icon: Stethoscope,
    iconBg: 'bg-emerald-100 text-emerald-700',
    selectedBorder: 'border-emerald-500 bg-emerald-50/70 text-emerald-950',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultServices: ['GENERAL_EMERGENCY'],
    defaultEquipment: ['OXYGEN']
  }
];

const CATEGORY_MAP = new Map<string, ConditionCategoryInfo>(
  CONDITION_CATEGORIES.map((c) => [c.id, c])
);

export function getConditionCategoryInfo(categoryId?: string): ConditionCategoryInfo {
  const key = (categoryId || 'GENERAL_EMERGENCY').toUpperCase();
  const exact = CATEGORY_MAP.get(key);
  if (exact) return exact;

  // Graceful fallback for any legacy/custom string such as "MEDICAL"
  const fallback = CONDITION_CATEGORIES[CONDITION_CATEGORIES.length - 1];
  return {
    ...fallback,
    id: key,
    name: key.replaceAll('_', ' '),
    shortName: key.replaceAll('_', ' ')
  };
}

const KNOWN_PLACE_COORDS: Array<{ keywords: string[]; lat: number; lon: number }> = [
  { keywords: ['tiruchengode', 'sankari'], lat: 11.3792, lon: 77.8950 },
  { keywords: ['elayampalayam', 'vivekanandha'], lat: 11.3542, lon: 77.9298 },
  { keywords: ['kumarapalayam', 'komarapalayam'], lat: 11.4420, lon: 77.7210 },
  { keywords: ['pallipalayam'], lat: 11.3600, lon: 77.7400 },
  { keywords: ['namakkal'], lat: 11.2185, lon: 78.1650 },
  { keywords: ['rasipuram'], lat: 11.4582, lon: 78.1712 },
  { keywords: ['velur', 'paramathi'], lat: 11.0850, lon: 78.0100 },
  { keywords: ['mohanur'], lat: 11.0475, lon: 78.1392 },
  { keywords: ['erode'], lat: 11.3410, lon: 77.7172 },
  { keywords: ['perundurai'], lat: 11.2785, lon: 77.5835 },
  { keywords: ['bhavani'], lat: 11.4480, lon: 77.6830 },
  { keywords: ['gobi', 'gobichettipalayam'], lat: 11.4540, lon: 77.4380 },
  { keywords: ['thindal'], lat: 11.3250, lon: 77.6690 },
  { keywords: ['sathy', 'sathyamangalam'], lat: 11.5034, lon: 77.2412 },
  { keywords: ['modakkurichi'], lat: 11.2354, lon: 77.7548 }
];

export function resolveRegionalCoordinates(address: string): { lat: number; lon: number } {
  const lower = address.toLowerCase();
  for (const place of KNOWN_PLACE_COORDS) {
    if (place.keywords.some((kw) => lower.includes(kw))) {
      return { lat: place.lat, lon: place.lon };
    }
  }
  return { lat: 11.3792, lon: 77.8950 };
}
