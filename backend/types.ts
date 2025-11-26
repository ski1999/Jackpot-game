export type WireStatus = 'intact' | 'cut';

export interface Wire {
  id: number;
  color: string;
  status: WireStatus;
  isBomb: boolean;
  multiplier: number;
}

export type PlayerStatus = 'WAITING' | 'PLAYING' | 'SAFE' | 'ELIMINATED' | 'WINNER';

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  status: PlayerStatus;
  avatarId: number;
  socketId?: string; // Backend specific: map to WS connection
}

export interface MultiplayerConfig {
  roomCode: string;
  password?: string;
  maxPlayers: number;
  numLosers: number;
  numWinners: number;
}

export interface MultiplayerRoom {
  config: MultiplayerConfig;
  players: Player[];
  phase: 'LOBBY' | 'GAME_LOSER_ROUND' | 'GAME_WINNER_ROUND' | 'RESULTS';
  currentTurnIndex: number;
  losersFound: number;
  winnersFound: number;
  results: {
    losers: Player[];
    winners: Player[];
    survivors: Player[];
  };
  // Dynamic Game State
  lastActionMessage?: string;
  currentProb?: number;
  currentWires?: Wire[];
  turnResult?: { hit: boolean };
}