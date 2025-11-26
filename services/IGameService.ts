
import { MultiplayerConfig, MultiplayerRoom } from '../types';

export type GameListener = (room: MultiplayerRoom | null) => void;
export type ErrorListener = (error: string | null) => void;

export interface IGameService {
  // State Subscription
  subscribe(listener: GameListener): () => void;
  subscribeError(listener: ErrorListener): () => void;
  
  // Actions
  connect(nickname: string): void;
  createRoom(config: MultiplayerConfig): Promise<void>;
  joinRoom(code: string, password?: string): Promise<void>;
  leaveRoom(): void;
  startGame(): void;
  
  // Gameplay Actions
  spin(): void;
  cutWire(wireId: number): void;
  
  // Getters
  getCurrentRoom(): MultiplayerRoom | null;
  getPlayerId(): string;
}
