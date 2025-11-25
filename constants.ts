import { StageConfig, SlotSymbol } from './types';

// --- Symbol Sets ---

export const SYMBOL_SETS: Record<string, SlotSymbol[]> = {
  CLASSIC: [
    { id: 'cherry', char: '🍒', color: 'text-red-500', value: 10 },
    { id: 'lemon', char: '🍋', color: 'text-yellow-400', value: 20 },
    { id: 'grape', char: '🍇', color: 'text-purple-500', value: 30 },
    { id: 'bell', char: '🔔', color: 'text-yellow-600', value: 40 },
    { id: 'diamond', char: '💎', color: 'text-cyan-400', value: 50 },
    { id: 'seven', char: '7️⃣', color: 'text-red-600', value: 100 },
  ],
  RPG: [
    { id: 'potion', char: '🧪', color: 'text-green-400', value: 10 },
    { id: 'shield', char: '🛡️', color: 'text-slate-400', value: 20 },
    { id: 'dagger', char: '🗡️', color: 'text-slate-200', value: 30 },
    { id: 'scroll', char: '📜', color: 'text-yellow-200', value: 40 },
    { id: 'chest', char: '🧰', color: 'text-yellow-600', value: 50 },
    { id: 'crown', char: '👑', color: 'text-yellow-400', value: 100 },
  ],
  SPACE: [
    { id: 'meteor', char: '☄️', color: 'text-orange-400', value: 10 },
    { id: 'satellite', char: '🛰️', color: 'text-slate-300', value: 20 },
    { id: 'rocket', char: '🚀', color: 'text-red-400', value: 30 },
    { id: 'alien', char: '👾', color: 'text-green-500', value: 40 },
    { id: 'planet', char: '🪐', color: 'text-purple-400', value: 50 },
    { id: 'ufo', char: '🛸', color: 'text-cyan-400', value: 100 },
  ],
  NATURE: [
    { id: 'leaf', char: '🍃', color: 'text-green-500', value: 10 },
    { id: 'mushroom', char: '🍄', color: 'text-red-400', value: 20 },
    { id: 'cactus', char: '🌵', color: 'text-green-700', value: 30 },
    { id: 'flower', char: '🌻', color: 'text-yellow-500', value: 40 },
    { id: 'tree', char: '🌲', color: 'text-green-800', value: 50 },
    { id: 'sun', char: '☀️', color: 'text-yellow-300', value: 100 },
  ]
};

const THEMES = ['CLASSIC', 'RPG', 'SPACE', 'NATURE'];
const COLORS = [
  { p: 'bg-red-700', s: 'bg-red-900', a: 'border-yellow-500', g: 'from-red-950 via-slate-900 to-black' },
  { p: 'bg-blue-700', s: 'bg-indigo-900', a: 'border-cyan-400', g: 'from-blue-950 via-slate-900 to-black' },
  { p: 'bg-emerald-700', s: 'bg-emerald-900', a: 'border-lime-400', g: 'from-emerald-950 via-slate-900 to-black' },
  { p: 'bg-purple-700', s: 'bg-purple-900', a: 'border-pink-400', g: 'from-purple-950 via-slate-900 to-black' },
  { p: 'bg-slate-700', s: 'bg-slate-800', a: 'border-white', g: 'from-gray-900 via-slate-950 to-black' },
  { p: 'bg-orange-700', s: 'bg-orange-900', a: 'border-yellow-300', g: 'from-orange-950 via-slate-900 to-black' },
];

export const STAGES: StageConfig[] = Array.from({ length: 51 }, (_, i) => {
  const stageNum = i + 1;
  const themeIndex = i % THEMES.length;
  const colorIndex = i % COLORS.length;
  const config = COLORS[colorIndex];
  
  // Probability Curve: Starts at 15%, decreases slowly, but never below 1%
  // Oscillates slightly to give "lucky" stages
  const baseProb = Math.max(0.01, 0.15 - (i * 0.002) + (Math.sin(i) * 0.02));

  return {
    id: stageNum,
    name: `LEVEL ${stageNum < 10 ? '0' + stageNum : stageNum}`,
    primaryColor: config.p,
    secondaryColor: config.s,
    accentColor: config.a,
    bgGradient: config.g,
    baseProb: parseFloat(baseProb.toFixed(3)),
    wireCount: Math.min(8, 3 + Math.floor(i / 5)), // Increases cap at 8
    jackpotReward: 500 + (i * 250),
    symbolSetId: THEMES[themeIndex],
  };
});

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
