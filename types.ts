
export type ViewState = 'front' | 'back';

export type WireStatus = 'intact' | 'cut';

export type SpinSpeed = 'SLOW' | 'NORMAL' | 'FAST';

export interface GameSettings {
  volume: number;
  speed: SpinSpeed;
  storyMode: boolean;
}

export interface Wire {
  id: number;
  color: string;
  status: WireStatus;
  isBomb: boolean;
  multiplier: number; // How much it multiplies the current probability
}

export interface SlotSymbol {
  id: string;
  char?: string; // Fallback
  color: string; // Tailwind text color class for fallback, or fill color for pixel art
  value: number;
  shape?: string[]; // 10x10 grid, 1 = fill, 0 = empty
}

export interface StageConfig {
  id: number;
  name: string;
  primaryColor: string; // Tailwind class mostly
  secondaryColor: string;
  accentColor: string;
  baseProb: number;
  wireCount: number;
  jackpotReward: number;
  bgGradient: string;
  symbolSetId: string;
}
