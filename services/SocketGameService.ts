import { IGameService, GameListener, ErrorListener } from './IGameService';
import { MultiplayerConfig, MultiplayerRoom, PlayerStats } from '../types';
import { CONFIG } from '../config';

/**
 * Production implementation using WebSockets.
 */
export class SocketGameService implements IGameService {
  private socket: WebSocket | null = null;
  private room: MultiplayerRoom | null = null;
  private listeners: GameListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private playerId: string = '';
  private persistentToken: string | null = null;
  private pendingLeaderboardResolve: ((stats: PlayerStats[]) => void) | null = null;

  constructor() {
    console.log("Initializing Production Socket Service...");
    // Load persisted token on init
    if (typeof window !== 'undefined') {
        this.persistentToken = localStorage.getItem('faz_token');
    }
  }

  subscribe(listener: GameListener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  subscribeError(listener: ErrorListener) {
    this.errorListeners.push(listener);
    return () => { this.errorListeners = this.errorListeners.filter(l => l !== listener); };
  }

  connect(nickname: string, manualToken?: string) {
    this.socket = new WebSocket(CONFIG.SOCKET_URL);
    
    // Override persistence if manual token provided (Recovery)
    if (manualToken) {
        this.persistentToken = manualToken;
    }

    this.socket.onopen = () => {
        console.log("Connected to Game Server");
        // Send handshake with existing token if we have one
        this.socket?.send(JSON.stringify({ 
            type: 'AUTH', 
            payload: {
                nickname,
                token: this.persistentToken // Send the saved UUID
            }
        }));
    };

    this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
    };

    this.socket.onerror = () => {
        this.notifyError("CONNECTION FAILED");
    };
  }

  private handleMessage(data: any) {
      switch(data.type) {
          case 'ROOM_UPDATE':
              this.room = data.payload;
              this.notify();
              break;
          case 'ERROR':
              this.notifyError(data.message);
              break;
          case 'IDENTITY':
              this.playerId = data.id; // Session ID
              if (data.userId) {
                  // Server sent back our Persistent ID (either confirmed old one or generated new one)
                  this.persistentToken = data.userId;
                  localStorage.setItem('faz_token', data.userId);
              }
              break;
          case 'LEADERBOARD_DATA':
              if (this.pendingLeaderboardResolve) {
                  this.pendingLeaderboardResolve(data.payload);
                  this.pendingLeaderboardResolve = null;
              }
              break;
      }
  }

  private notify() {
    this.listeners.forEach(l => l(this.room));
  }

  private notifyError(msg: string) {
    this.errorListeners.forEach(l => l(msg));
  }

  createRoom(config: MultiplayerConfig): Promise<void> {
    this.send('CREATE_ROOM', config);
    return Promise.resolve();
  }

  joinRoom(code: string, password?: string): Promise<void> {
    this.send('JOIN_ROOM', { code, password });
    return Promise.resolve();
  }

  leaveRoom(): void {
    this.send('LEAVE_ROOM', {});
    this.room = null;
    this.notify();
  }

  startGame(): void {
    this.send('START_GAME', {});
  }

  spin(): void {
    this.send('ACTION_SPIN', {});
  }

  cutWire(wireId: number): void {
    this.send('ACTION_CUT_WIRE', { wireId });
  }

  getLeaderboard(): Promise<PlayerStats[]> {
      return new Promise((resolve) => {
          this.pendingLeaderboardResolve = resolve;
          this.send('GET_LEADERBOARD', {});
          
          // Timeout fallback
          setTimeout(() => {
              if (this.pendingLeaderboardResolve) {
                  resolve([]);
                  this.pendingLeaderboardResolve = null;
              }
          }, 5000);
      });
  }

  submitScore(score: number, stages: number = 0): void {
      this.send('SUBMIT_SCORE', { score, stages });
  }

  sendTelemetry(action: string, details: any): void {
      this.send('RECORD_TELEMETRY', { action, details });
  }

  getCurrentRoom() {
    return this.room;
  }

  getPlayerId() {
    return this.playerId;
  }

  private send(type: string, payload: any) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type, payload }));
      } else {
          // If socket is closed (e.g. Single Player offline), we just ignore or log
          // In a real app we might queue these
          if (type === 'RECORD_TELEMETRY') {
              console.log('[Telemetry Skipped - Offline]', payload);
          } else {
              this.notifyError("NOT CONNECTED");
          }
      }
  }
}