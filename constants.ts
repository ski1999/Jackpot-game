import { StageConfig, SlotSymbol } from './types';

// --- Symbol Sets ---

export const SYMBOL_SETS: Record<string, SlotSymbol[]> = {
  PIZZERIA: [
    { id: 'pizza', char: '🍕', color: 'text-orange-600', value: 10 },
    { id: 'cupcake', char: '🧁', color: 'text-pink-600', value: 20 },
    { id: 'mic', char: '🎤', color: 'text-slate-400', value: 30 },
    { id: 'guitar', char: '🎸', color: 'text-red-700', value: 40 },
    { id: 'hook', char: '🪝', color: 'text-slate-200', value: 50 },
    { id: 'bear', char: '🐻', color: 'text-yellow-700', value: 100 },
  ],
  SECURITY: [
    { id: 'battery', char: '🔋', color: 'text-green-600', value: 10 },
    { id: 'tape', char: '📼', color: 'text-slate-500', value: 20 },
    { id: 'flashlight', char: '🔦', color: 'text-yellow-200', value: 30 },
    { id: 'camera', char: '📷', color: 'text-slate-300', value: 40 },
    { id: 'badge', char: '📛', color: 'text-yellow-600', value: 50 },
    { id: 'siren', char: '🚨', color: 'text-red-600', value: 100 },
  ],
  NIGHTMARE: [
    { id: 'teeth', char: '🦷', color: 'text-slate-200', value: 10 },
    { id: 'eye', char: '👁️', color: 'text-red-400', value: 20 },
    { id: 'drop', char: '🩸', color: 'text-red-700', value: 30 },
    { id: 'skull', char: '💀', color: 'text-slate-300', value: 40 },
    { id: 'ghost', char: '👻', color: 'text-purple-300', value: 50 },
    { id: 'demon', char: '👿', color: 'text-purple-600', value: 100 },
  ],
  ARCADE: [
    { id: 'ticket', char: '🎟️', color: 'text-yellow-500', value: 10 },
    { id: 'coin', char: '🪙', color: 'text-yellow-200', value: 20 },
    { id: 'joystick', char: '🕹️', color: 'text-red-500', value: 30 },
    { id: 'invader', char: '👾', color: 'text-green-500', value: 40 },
    { id: 'balloon', char: '🎈', color: 'text-red-600', value: 50 },
    { id: 'prize', char: '🎁', color: 'text-purple-500', value: 100 },
  ]
};

const THEMES = ['PIZZERIA', 'SECURITY', 'NIGHTMARE', 'ARCADE'];

// Darker, dirtier color palettes
const COLORS = [
  { p: 'bg-zinc-900', s: 'bg-black', a: 'border-yellow-900', g: 'from-black via-zinc-900 to-black' },
  { p: 'bg-slate-900', s: 'bg-black', a: 'border-slate-800', g: 'from-black via-slate-950 to-black' },
  { p: 'bg-red-950', s: 'bg-black', a: 'border-red-900', g: 'from-black via-red-950 to-black' },
  { p: 'bg-indigo-950', s: 'bg-black', a: 'border-indigo-900', g: 'from-black via-indigo-950 to-black' },
];

export const STAGES: StageConfig[] = Array.from({ length: 51 }, (_, i) => {
  const stageNum = i + 1;
  const themeIndex = i % THEMES.length;
  const colorIndex = i % COLORS.length;
  const config = COLORS[colorIndex];
  
  // Probability Curve: Starts at 15%, decreases slowly
  const baseProb = Math.max(0.01, 0.15 - (i * 0.002) + (Math.sin(i) * 0.02));

  let name = `NIGHT ${stageNum}`;
  if (stageNum % 5 === 0) name = `NIGHT ${stageNum} [HARD]`;
  if (stageNum > 50) name = "CUSTOM NIGHT";

  return {
    id: stageNum,
    name: name,
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
  'bg-red-800',
  'bg-blue-800',
  'bg-green-800',
  'bg-yellow-700',
  'bg-purple-800',
  'bg-orange-800',
  'bg-gray-400', // White/Grey wire
  'bg-pink-800',
];