
import { StageConfig, SlotSymbol, SpinSpeed } from './types';

// --- Pixel Art Shapes (10x10) ---
// 1 = Filled, 0 = Empty
const PIXEL_SHAPES = {
  // Reused shapes mapped to new concepts
  DIAMOND: [ // Was Pizza
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
  BELL: [ // Was Cupcake
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
  BAR: [ // Was Mic
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
  SEVEN: [ // Was Guitar
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
  CHERRY: [ // Was Hook
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
  CROWN: [ // Was Bear
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
  ],
  TICKET: [
    "1111111111",
    "1000000001",
    "1011111101",
    "1010000101",
    "1010000101",
    "1011111101",
    "1000000001",
    "1111111111",
    "0000000000",
    "0000000000"
  ]
};

// --- Symbol Sets ---

export const SYMBOL_SETS: Record<string, SlotSymbol[]> = {
  CLASSIC: [ // Replaces PIZZERIA
    { id: 'cherry', color: '#ea580c', value: 10, shape: PIXEL_SHAPES.CHERRY },
    { id: 'bell', color: '#db2777', value: 20, shape: PIXEL_SHAPES.BELL },
    { id: 'bar', color: '#94a3b8', value: 30, shape: PIXEL_SHAPES.BAR },
    { id: 'seven', color: '#b91c1c', value: 40, shape: PIXEL_SHAPES.SEVEN },
    { id: 'diamond', color: '#cbd5e1', value: 50, shape: PIXEL_SHAPES.DIAMOND },
    { id: 'jackpot', color: '#a16207', value: 100, shape: PIXEL_SHAPES.CROWN },
  ],
  INDUSTRIAL: [ // Replaces SECURITY
    { id: 'battery', color: '#16a34a', value: 10, shape: PIXEL_SHAPES.BATTERY },
    { id: 'fuse', color: '#64748b', value: 20, shape: PIXEL_SHAPES.BAR }, 
    { id: 'bolt', color: '#fef08a', value: 30, shape: PIXEL_SHAPES.SEVEN },
    { id: 'saw', color: '#cbd5e1', value: 40, shape: PIXEL_SHAPES.DIAMOND },
    { id: 'hazard', color: '#ca8a04', value: 50, shape: PIXEL_SHAPES.CHERRY },
    { id: 'alarm', color: '#dc2626', value: 100, shape: PIXEL_SHAPES.CROWN },
  ],
  CURSED: [ // Replaces NIGHTMARE
    { id: 'hook', color: '#e2e8f0', value: 10, shape: PIXEL_SHAPES.CHERRY },
    { id: 'blood', color: '#f87171', value: 20, shape: PIXEL_SHAPES.BELL },
    { id: 'eye', color: '#b91c1c', value: 30, shape: PIXEL_SHAPES.DIAMOND },
    { id: 'skull', color: '#cbd5e1', value: 40, shape: PIXEL_SHAPES.SKULL },
    { id: 'ghost', color: '#d8b4fe', value: 50, shape: PIXEL_SHAPES.BATTERY },
    { id: 'demon', color: '#9333ea', value: 100, shape: PIXEL_SHAPES.CROWN },
  ],
  ARCADE: [
    { id: 'ticket', color: '#eab308', value: 10, shape: PIXEL_SHAPES.BATTERY },
    { id: 'coin', color: '#fef08a', value: 20, shape: PIXEL_SHAPES.DIAMOND },
    { id: 'joystick', color: '#ef4444', value: 30, shape: PIXEL_SHAPES.BAR },
    { id: 'invader', color: '#22c55e', value: 40, shape: PIXEL_SHAPES.SKULL },
    { id: 'balloon', color: '#dc2626', value: 50, shape: PIXEL_SHAPES.BELL },
    { id: 'prize', color: '#a855f7', value: 100, shape: PIXEL_SHAPES.CROWN },
  ],
  // Multiplayer Specific Sets
  EXPLOSION: [
     { id: 'safe1', color: '#22c55e', value: 1, shape: PIXEL_SHAPES.BATTERY },
     { id: 'safe2', color: '#eab308', value: 1, shape: PIXEL_SHAPES.CHERRY },
     { id: 'safe3', color: '#3b82f6', value: 1, shape: PIXEL_SHAPES.BAR },
     { id: 'bomb', color: '#dc2626', value: 0, shape: PIXEL_SHAPES.BOMB }, // The "Jackpot"
  ],
  PRIZE: [
     { id: 'safe1', color: '#22c55e', value: 1, shape: PIXEL_SHAPES.BATTERY },
     { id: 'safe2', color: '#eab308', value: 1, shape: PIXEL_SHAPES.CHERRY },
     { id: 'safe3', color: '#3b82f6', value: 1, shape: PIXEL_SHAPES.BAR },
     { id: 'ticket', color: '#fbbf24', value: 100, shape: PIXEL_SHAPES.TICKET }, // The "Jackpot"
  ]
};

export const SPEED_CONFIG: Record<SpinSpeed, { totalDuration: number, reelDelay: number, spinInterval: number }> = {
  SLOW: { totalDuration: 2500, reelDelay: 400, spinInterval: 150 },
  NORMAL: { totalDuration: 1500, reelDelay: 250, spinInterval: 100 },
  FAST: { totalDuration: 600, reelDelay: 100, spinInterval: 60 }
};

const THEMES = ['CLASSIC', 'INDUSTRIAL', 'CURSED', 'ARCADE'];

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

  let name = `FLOOR ${stageNum}`;
  if (stageNum % 5 === 0) name = `FLOOR ${stageNum} [VIP]`;
  if (stageNum > 50) name = "PENTHOUSE";

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
  "LOG 001: The management says the machines are 'temperamental'. I say they are hungry.",
  "LOG 002: Found another coin jammed in the slot. It was covered in teeth marks.",
  "LOG 003: The lights in the back hallway flicker in Morse code. S-O-S.",
  "LOG 004: Rewired the breaker box. Got a shock that felt... personal.",
  "LOG 005: There are rooms in this casino that aren't on the blueprints.",
  "LOG 006: A guest won the jackpot yesterday. Nobody has seen them since.",
  "LOG 007: The elevator doesn't go to the lobby anymore. Only down.",
  "LOG 008: I can hear the slot machines spinning even when they are unplugged.",
  "LOG 009: Management offered me a promotion. 'Head of Disposal'. I declined.",
  "LOG 010: I cut the red wire. The machine screamed. It wasn't a mechanical sound.",
];

export const MOCK_BOT_NAMES = [
  "HighRoller_88",
  "CardShark",
  "LadyLuck",
  "SlotJunkie",
  "SnakeEyes",
  "JackpotJimmy",
  "PennyPincher",
  "TheDealer"
];

export const GAME_RESULT_THEMES = [
  { label: "BIO-METRIC VALUE", currency: "ORGAN CREDITS" },   // Medical Experiment
  { label: "SOUL WEIGHT", currency: "BLOOD OUNCES" },         // Cursed Debt
  { label: "SEVERANCE PACKAGE", currency: "COMPENSATION" },   // Industrial Accident
  { label: "CASHOUT VOUCHER", currency: "DIRTY CHIPS" },      // Corrupt Casino
  { label: "SALVAGE APPRAISAL", currency: "SCRAP METAL" },    // Scavenger
];
