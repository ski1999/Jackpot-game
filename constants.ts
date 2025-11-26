
import { StageConfig, SlotSymbol, SpinSpeed } from './types';

// --- Pixel Art Shapes (10x10) ---
// 1 = Filled, 0 = Empty
const PIXEL_SHAPES = {
  PIZZA: [
    "0000110000",
    "0001111000",
    "0011111100",
    "0001111000",
    "0000110000",
    "0011111100",
    "0110110110",
    "0110110110",
    "0011111100",
    "0001111000"
  ],
  CUPCAKE: [
    "0001111000",
    "0011111100",
    "0111011110",
    "0111111110",
    "0011111100",
    "0011111100",
    "0001111000",
    "0001111000",
    "0001111000",
    "0011111100"
  ],
  MIC: [
    "0001111000",
    "0011111100",
    "0011111100",
    "0011111100",
    "0001111000",
    "0000110000",
    "0000110000",
    "0000110000",
    "0011111100",
    "0011111100"
  ],
  GUITAR: [
    "0000011100",
    "0000111110",
    "0000011100",
    "0000001000",
    "0000001000",
    "0000001000",
    "0001111100",
    "0011111110",
    "0011111110",
    "0001111100"
  ],
  HOOK: [
    "0000000000",
    "0000111000",
    "0000111000",
    "0000111000",
    "0000111000",
    "0000111000",
    "0000111000",
    "0011111000",
    "0011000000",
    "0011100000"
  ],
  BEAR: [
    "1000000001",
    "1100000011",
    "1111111111",
    "1101111011",
    "1111111111",
    "0110000110",
    "0111111110",
    "0110000110",
    "0011111100",
    "0001111000"
  ],
  // Reuse shapes for other themes with different colors for now to save space
  BATTERY: [
    "0000110000",
    "0011111100",
    "0010011100",
    "0010011100",
    "0011111100",
    "0011111100",
    "0011111100",
    "0011111100",
    "0011111100",
    "0011111100"
  ],
  SKULL: [
    "0001111000",
    "0011111100",
    "0111111110",
    "0110110110",
    "0111111110",
    "0011111100",
    "0011111100",
    "0001111000",
    "0001111000",
    "0001111000"
  ],
  BOMB: [
    "0000011000",
    "0000100100",
    "0001111110",
    "0011111111",
    "0111111111",
    "0111111111",
    "0111111111",
    "0011111111",
    "0001111110",
    "0000000000"
  ]
};

// --- Symbol Sets ---

export const SYMBOL_SETS: Record<string, SlotSymbol[]> = {
  PIZZERIA: [
    { id: 'pizza', color: '#ea580c', value: 10, shape: PIXEL_SHAPES.PIZZA },
    { id: 'cupcake', color: '#db2777', value: 20, shape: PIXEL_SHAPES.CUPCAKE },
    { id: 'mic', color: '#94a3b8', value: 30, shape: PIXEL_SHAPES.MIC },
    { id: 'guitar', color: '#b91c1c', value: 40, shape: PIXEL_SHAPES.GUITAR },
    { id: 'hook', color: '#cbd5e1', value: 50, shape: PIXEL_SHAPES.HOOK },
    { id: 'bear', color: '#a16207', value: 100, shape: PIXEL_SHAPES.BEAR },
  ],
  SECURITY: [
    { id: 'battery', color: '#16a34a', value: 10, shape: PIXEL_SHAPES.BATTERY },
    { id: 'tape', color: '#64748b', value: 20, shape: PIXEL_SHAPES.MIC }, // Reusing mic shape as placeholder
    { id: 'flashlight', color: '#fef08a', value: 30, shape: PIXEL_SHAPES.GUITAR },
    { id: 'camera', color: '#cbd5e1', value: 40, shape: PIXEL_SHAPES.PIZZA },
    { id: 'badge', color: '#ca8a04', value: 50, shape: PIXEL_SHAPES.HOOK },
    { id: 'siren', color: '#dc2626', value: 100, shape: PIXEL_SHAPES.BEAR },
  ],
  NIGHTMARE: [
    { id: 'teeth', color: '#e2e8f0', value: 10, shape: PIXEL_SHAPES.HOOK },
    { id: 'eye', color: '#f87171', value: 20, shape: PIXEL_SHAPES.CUPCAKE },
    { id: 'drop', color: '#b91c1c', value: 30, shape: PIXEL_SHAPES.PIZZA },
    { id: 'skull', color: '#cbd5e1', value: 40, shape: PIXEL_SHAPES.SKULL },
    { id: 'ghost', color: '#d8b4fe', value: 50, shape: PIXEL_SHAPES.BATTERY },
    { id: 'demon', color: '#9333ea', value: 100, shape: PIXEL_SHAPES.BEAR },
  ],
  ARCADE: [
    { id: 'ticket', color: '#eab308', value: 10, shape: PIXEL_SHAPES.BATTERY },
    { id: 'coin', color: '#fef08a', value: 20, shape: PIXEL_SHAPES.PIZZA },
    { id: 'joystick', color: '#ef4444', value: 30, shape: PIXEL_SHAPES.MIC },
    { id: 'invader', color: '#22c55e', value: 40, shape: PIXEL_SHAPES.SKULL },
    { id: 'balloon', color: '#dc2626', value: 50, shape: PIXEL_SHAPES.CUPCAKE },
    { id: 'prize', color: '#a855f7', value: 100, shape: PIXEL_SHAPES.BEAR },
  ],
  // Multiplayer Specific Sets
  EXPLOSION: [
     { id: 'safe1', color: '#22c55e', value: 1, shape: PIXEL_SHAPES.BATTERY },
     { id: 'safe2', color: '#eab308', value: 1, shape: PIXEL_SHAPES.HOOK },
     { id: 'safe3', color: '#3b82f6', value: 1, shape: PIXEL_SHAPES.MIC },
     { id: 'bomb', color: '#dc2626', value: 0, shape: PIXEL_SHAPES.BOMB }, // The "Jackpot"
  ]
};

export const SPEED_CONFIG: Record<SpinSpeed, { totalDuration: number, reelDelay: number, spinInterval: number }> = {
  SLOW: { totalDuration: 2500, reelDelay: 400, spinInterval: 150 },
  NORMAL: { totalDuration: 1500, reelDelay: 250, spinInterval: 100 },
  FAST: { totalDuration: 600, reelDelay: 100, spinInterval: 60 }
};

const THEMES = ['PIZZERIA', 'SECURITY', 'NIGHTMARE', 'ARCADE'];

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
    wireCount: Math.min(8, 3 + Math.floor(i / 5)), 
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
  'bg-gray-400',
  'bg-pink-800',
];

export const STORY_LOGS = [
  "ENTRY #01: The animatronics... they seem to be watching me. I swear Foxy moved when the camera was off.",
  "ENTRY #02: Someone tampered with the wiring in the back. The patterns don't match the schematics.",
  "ENTRY #03: The smell coming from the suits... it's like something is rotting inside them.",
  "ENTRY #04: I found a cassette tape hidden in the prize counter. It's just screaming.",
  "ENTRY #05: IT'S ME. IT'S ME. IT'S ME. IT'S ME. IT'S ME. IT'S ME.",
  "ENTRY #06: The power fluctuates when they get close. I have to keep the generator running.",
  "ENTRY #07: I don't think I'm getting a paycheck this week. I don't think I'm leaving.",
  "ENTRY #08: The doors are jammed. The phone line is dead. Only the machine works.",
  "ENTRY #09: They aren't singing anymore. They are whispering my name.",
  "ENTRY #10: I cut the red wire and heard a laugh. Not a mechanical one.",
];

export const MOCK_BOT_NAMES = [
  "Bonnie_Bot",
  "Chica_Fan",
  "Foxy_Runner",
  "Purple_Guy",
  "Phone_Guy",
  "Endo_01",
  "Crying_Child",
  "Vanny"
];
