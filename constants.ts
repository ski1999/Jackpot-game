import { StageConfig, SlotSymbol } from './types';

export const SYMBOLS: SlotSymbol[] = [
  { id: 'cherry', char: '🍒', color: 'text-red-500', value: 10 },
  { id: 'lemon', char: '🍋', color: 'text-yellow-400', value: 20 },
  { id: 'grape', char: '🍇', color: 'text-purple-500', value: 30 },
  { id: 'bell', char: '🔔', color: 'text-yellow-600', value: 40 },
  { id: 'diamond', char: '💎', color: 'text-cyan-400', value: 50 },
  { id: 'seven', char: '7️⃣', color: 'text-red-600', value: 100 },
];

export const STAGES: StageConfig[] = [
  {
    id: 1,
    name: "CLASSIC MK-I",
    primaryColor: "bg-red-700",
    secondaryColor: "bg-red-900",
    accentColor: "border-yellow-500",
    baseProb: 0.05, // 5%
    wireCount: 4,
    jackpotReward: 500,
    bgGradient: "from-red-900 via-slate-900 to-black",
  },
  {
    id: 2,
    name: "CYBER NEON",
    primaryColor: "bg-blue-700",
    secondaryColor: "bg-indigo-900",
    accentColor: "border-cyan-400",
    baseProb: 0.025, // 2.5%
    wireCount: 5,
    jackpotReward: 2000,
    bgGradient: "from-indigo-900 via-purple-900 to-black",
  },
  {
    id: 3,
    name: "GOLDEN VAULT",
    primaryColor: "bg-yellow-600",
    secondaryColor: "bg-yellow-800",
    accentColor: "border-white",
    baseProb: 0.01, // 1%
    wireCount: 6,
    jackpotReward: 10000,
    bgGradient: "from-yellow-900 via-amber-950 to-black",
  },
  {
    id: 4,
    name: "DOOMSDAY DEVICE",
    primaryColor: "bg-slate-700",
    secondaryColor: "bg-slate-800",
    accentColor: "border-red-600",
    baseProb: 0.005, // 0.5%
    wireCount: 8,
    jackpotReward: 50000,
    bgGradient: "from-slate-900 via-gray-900 to-black",
  }
];

export const WIRE_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
];