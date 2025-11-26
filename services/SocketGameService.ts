
import { IGameService, GameListener, ErrorListener } from './IGameService';
import { MultiplayerConfig, MultiplayerRoom } from '../types';
import { CONFIG } from '../config';

/**
 * Production implementation using WebSockets.
 * This is a skeleton to be connected to a real backend (Node.js/Socket.io/Go/etc).
 */
export class SocketGameService implements IGameService {
  private socket: WebSocket | null = null;
  private room: MultiplayerRoom | null = null;
  private listeners: GameListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private playerId: string = '';

  constructor() {
    console.log("Initializing Production Socket Service...");
  }

  subscribe(listener: GameListener) {
    this.listeners.push(listener);
    // Return unsubscribe
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  subscribeError(listener: ErrorListener) {
    this.errorListeners.push(listener);
    return () => { this.errorListeners = this.errorListeners.filter(l => l !== listener); };
  }

  connect(nickname: string) {
    // 1. Establish WS Connection
    this.socket = new WebSocket(CONFIG.SOCKET_URL);
    
    this.socket.onopen = () => {
        console.log("Connected to Game Server");
        // Send handshake / auth
        this.socket?.send(JSON.stringify({ type: 'AUTH', nickname }));
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
              this.playerId = data.id;
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
          this.notifyError("NOT CONNECTED");
      }
  }
}
