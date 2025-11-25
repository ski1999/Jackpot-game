export type ViewState = 'front' | 'back';

export type WireStatus = 'intact' | 'cut';

export interface Wire {
  id: number;
  color: string;
  status: WireStatus;
  isBomb: boolean;
  multiplier: number; // How much it multiplies the current probability
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
}

export interface SlotSymbol {
  id: string;
  char: string;
  color: string;
  value: number;
}
