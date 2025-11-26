
import { IGameService, GameListener, ErrorListener } from './IGameService';
import { MultiplayerConfig, MultiplayerRoom, Player, Wire } from '../types';
import { MOCK_BOT_NAMES, WIRE_COLORS, SYMBOL_SETS } from '../constants';
import { soundEngine } from '../audio';

export class MockGameService implements IGameService {
  private room: MultiplayerRoom | null = null;
  private listeners: GameListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private playerId: string = '';
  private nickname: string = 'PLAYER';
  
  // Simulation Intervals
  private botInterval: any = null;
  private stateTimeout: any = null;

  constructor() {
    this.playerId = 'p-' + Date.now();
  }

  // --- Subscription ---

  subscribe(listener: GameListener) {
    this.listeners.push(listener);
    listener(this.room);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  subscribeError(listener: ErrorListener) {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.room));
  }

  private notifyError(msg: string) {
    this.errorListeners.forEach(l => l(msg));
    // Clear error after 3s
    setTimeout(() => this.errorListeners.forEach(l => l(null)), 3000);
  }

  // --- Connection ---

  connect(nickname: string) {
    this.nickname = nickname;
    this.playerId = 'p-' + Date.now(); // Reset ID on connect
  }

  getCurrentRoom() {
    return this.room;
  }

  getPlayerId() {
    return this.playerId;
  }

  // --- Lobby Actions ---

  async createRoom(config: MultiplayerConfig): Promise<void> {
    const host: Player = {
      id: this.playerId,
      nickname: this.nickname,
      isHost: true,
      status: 'WAITING',
      avatarId: Math.floor(Math.random() * 6)
    };

    this.room = {
      config,
      players: [host],
      phase: 'LOBBY',
      currentTurnIndex: 0,
      losersFound: 0,
      winnersFound: 0,
      results: { losers: [], winners: [], survivors: [] },
      // Mock specific state
      currentWires: [],
      currentProb: 0,
      lastActionMessage: 'WAITING FOR PLAYERS...'
    };

    this.notify();
    this.startBotSimulation();
  }

  async joinRoom(code: string, password?: string): Promise<void> {
    // In Mock mode, we simulate joining a room by creating a fake one if it doesn't exist
    // or joining the current one if code matches.
    
    if (this.room && this.room.config.roomCode === code) {
        if (this.room.config.password && this.room.config.password !== password) {
            this.notifyError("INVALID PASSWORD");
            return;
        }
        if (this.room.players.length >= this.room.config.maxPlayers) {
            this.notifyError("LOBBY FULL");
            return;
        }
        const me: Player = {
            id: this.playerId,
            nickname: this.nickname,
            isHost: false,
            status: 'WAITING',
            avatarId: Math.floor(Math.random() * 6)
        };
        this.room.players.push(me);
        this.notify();
        return;
    }

    // Simulate joining a remote room (Create a fake state)
    const fakeConfig: MultiplayerConfig = { 
       roomCode: code, maxPlayers: 5, numLosers: 1, numWinners: 1 
    };
    const me: Player = { 
       id: this.playerId, nickname: this.nickname, isHost: false, status: 'WAITING', avatarId: 3 
    };
    
    this.room = {
        config: fakeConfig,
        players: [
            { id: 'host', nickname: 'ADMIN', isHost: true, status: 'WAITING', avatarId: 1 }, 
            me
        ],
        phase: 'LOBBY',
        currentTurnIndex: 0,
        losersFound: 0,
        winnersFound: 0,
        results: { losers: [], winners: [], survivors: [] }
    };
    
    this.notify();
    this.startBotSimulation();
  }

  leaveRoom() {
    this.room = null;
    this.stopBotSimulation();
    this.notify();
  }

  startGame() {
    if (!this.room) return;
    this.room.phase = 'GAME_LOSER_ROUND';
    this.room.players.forEach(p => p.status = 'PLAYING');
    this.room.currentTurnIndex = 0;
    this.initTurn();
    this.notify();
  }

  // --- Gameplay Logic ---

  spin() {
     if (!this.room) return;
     
     // Determine outcome based on prob
     const hit = Math.random() < (this.room.currentProb || 0.1);
     this.handleTurnResult(hit);
  }

  cutWire(wireId: number) {
      if (!this.room || !this.room.currentWires) return;
      
      const wire = this.room.currentWires.find(w => w.id === wireId);
      if (!wire || wire.status === 'cut') return;

      // Update state
      wire.status = 'cut';
      
      if (wire.isBomb) {
          // Trap triggered
          this.handleTurnResult(true); // Instant hit
      } else {
          // Safe - Increase prob
          this.room.currentProb = Math.min(0.99, (this.room.currentProb || 0.1) * wire.multiplier);
          this.notify();
      }
  }

  // --- Internals ---

  private initTurn() {
      if (!this.room) return;
      
      const player = this.room.players[this.room.currentTurnIndex];
      this.room.lastActionMessage = `${player.nickname}'S TURN`;

      // 1. Set Prob
      this.room.currentProb = this.room.phase === 'GAME_LOSER_ROUND' ? 0.10 : 0.15;

      // 2. Gen Wires
      const wireCount = 6;
      const newWires: Wire[] = Array.from({ length: wireCount }).map((_, i) => ({
        id: i,
        color: WIRE_COLORS[i % WIRE_COLORS.length],
        status: 'intact',
        isBomb: false,
        multiplier: 1.2 + Math.random() * 0.5, 
      }));

      // 3. Place Traps
      if (this.room.phase === 'GAME_LOSER_ROUND') {
          let bombsPlaced = 0;
          while (bombsPlaced < 2) {
              const idx = Math.floor(Math.random() * wireCount);
              if (!newWires[idx].isBomb) {
                  newWires[idx].isBomb = true;
                  bombsPlaced++;
              }
          }
      } else {
          const trapIndex = Math.floor(Math.random() * wireCount);
          newWires[trapIndex].isBomb = true;
      }
      this.room.currentWires = newWires;
      this.room.turnResult = undefined; // Reset result for animation
      this.notify();
  }

  private handleTurnResult(hit: boolean) {
      if (!this.room) return;
      
      // Store result for UI animation (Drawer opening, etc)
      this.room.turnResult = { hit };
      this.notify(); // UI shows animation

      const player = this.room.players[this.room.currentTurnIndex];
      
      // Delay for animation duration
      setTimeout(() => {
          if (!this.room) return;
          this.room.turnResult = undefined; // Clear animation flag

          if (this.room.phase === 'GAME_LOSER_ROUND') {
              if (hit) {
                  player.status = 'ELIMINATED';
                  this.room.losersFound++;
                  this.room.results.losers.push(player);
                  this.room.lastActionMessage = `${player.nickname} ELIMINATED!`;
              } else {
                  this.room.lastActionMessage = `${player.nickname} SURVIVED.`;
              }

              if (this.room.losersFound >= this.room.config.numLosers) {
                  this.transitionPhase('GAME_WINNER_ROUND');
                  return;
              }
          } else if (this.room.phase === 'GAME_WINNER_ROUND') {
              if (hit) {
                  player.status = 'WINNER';
                  this.room.winnersFound++;
                  this.room.results.winners.push(player);
                  this.room.lastActionMessage = `${player.nickname} WON!`;
              } else {
                  this.room.lastActionMessage = `${player.nickname} NO PRIZE.`;
              }

              if (this.room.winnersFound >= this.room.config.numWinners) {
                  this.transitionPhase('RESULTS');
                  return;
              }
          }

          this.advanceTurn();
      }, 3000);
  }

  private advanceTurn() {
      if (!this.room) return;
      let nextIndex = (this.room.currentTurnIndex + 1) % this.room.players.length;
      let loopCount = 0;
      // Skip eliminated/won players
      while (
          (this.room.players[nextIndex].status === 'ELIMINATED' || this.room.players[nextIndex].status === 'WINNER') 
          && loopCount < this.room.players.length
      ) {
          nextIndex = (nextIndex + 1) % this.room.players.length;
          loopCount++;
      }
      this.room.currentTurnIndex = nextIndex;
      this.initTurn();
  }

  private transitionPhase(phase: MultiplayerRoom['phase']) {
      if (!this.room) return;
      this.room.lastActionMessage = phase === 'RESULTS' ? 'CALCULATING STATS...' : 'PHASE SHIFT INITIATED';
      this.notify();

      setTimeout(() => {
          if (!this.room) return;
          this.room.phase = phase;
          if (phase === 'RESULTS') {
              this.room.results.survivors = this.room.players.filter(p => p.status === 'PLAYING' || p.status === 'SAFE' || p.status === 'WAITING');
          } else {
              this.room.currentTurnIndex = 0;
              this.initTurn();
          }
          this.notify();
      }, 3000);
  }

  // --- Bot Simulation ---

  private startBotSimulation() {
      if (this.botInterval) clearInterval(this.botInterval);
      this.botInterval = setInterval(() => this.botLoop(), 2000);
  }

  private stopBotSimulation() {
      if (this.botInterval) clearInterval(this.botInterval);
  }

  private botLoop() {
      if (!this.room) return;

      // 1. Add bots in Lobby
      if (this.room.phase === 'LOBBY' && this.room.players.length < this.room.config.maxPlayers) {
          if (Math.random() > 0.7) return; // Random delay
          const botName = MOCK_BOT_NAMES[Math.floor(Math.random() * MOCK_BOT_NAMES.length)] + '_' + Math.floor(Math.random()*99);
          const bot: Player = {
              id: `bot-${Date.now()}-${Math.random()}`,
              nickname: botName.toUpperCase(),
              isHost: false,
              status: 'WAITING',
              avatarId: Math.floor(Math.random() * 6)
          };
          this.room.players.push(bot);
          this.notify();
          return;
      }

      // 2. Play game
      if (this.room.phase.includes('GAME') && !this.room.turnResult) {
          const activePlayer = this.room.players[this.room.currentTurnIndex];
          if (activePlayer.id === this.playerId) return; // My turn, do nothing

          // Bot Action
          // Ensure we don't spam actions
          if (this.room.lastActionMessage?.includes('SPINNING') || this.room.lastActionMessage?.includes('TAMPERING')) return;

          const hackChance = this.room.phase === 'GAME_LOSER_ROUND' ? 0.2 : 0.6;

          if (Math.random() < hackChance) {
               // Cut wire
               if (!this.room.currentWires) return;
               const intactWires = this.room.currentWires.filter(w => w.status === 'intact');
               if (intactWires.length > 0) {
                   const wire = intactWires[Math.floor(Math.random() * intactWires.length)];
                   this.room.lastActionMessage = `${activePlayer.nickname} IS TAMPERING...`;
                   this.notify();
                   setTimeout(() => this.cutWire(wire.id), 1000);
               } else {
                   this.spin();
               }
          } else {
               // Spin
               this.room.lastActionMessage = `${activePlayer.nickname} IS SPINNING...`;
               this.notify();
               setTimeout(() => this.spin(), 1000);
          }
      }
  }
}
