import { IGameService, GameListener, ErrorListener } from './IGameService';
import { MultiplayerConfig, MultiplayerRoom, Player, Wire, PlayerStats } from '../types';
import { MOCK_BOT_NAMES, WIRE_COLORS } from '../constants';

export class MockGameService implements IGameService {
  private room: MultiplayerRoom | null = null;
  private listeners: GameListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private playerId: string = '';
  private nickname: string = 'PLAYER';
  
  // Simulation Intervals
  private botInterval: any = null;

  // Internal Mock Leaderboard State
  private mockLeaderboard: PlayerStats[] = [
      { nickname: "PURPLE_GUY", high_score: 9999, wins: 50, losses: 2, games_played: 52 },
      { nickname: "PHONE_GUY", high_score: 5400, wins: 12, losses: 5, games_played: 17 },
      { nickname: "SCHMIDT", high_score: 4200, wins: 8, losses: 8, games_played: 16 },
      { nickname: "JEREMY", high_score: 3100, wins: 5, losses: 10, games_played: 15 },
      { nickname: "FRITZ", high_score: 2500, wins: 3, losses: 2, games_played: 5 },
  ];

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
    setTimeout(() => this.errorListeners.forEach(l => l(null)), 3000);
  }

  // --- Connection ---

  connect(nickname: string, manualToken?: string) {
    this.nickname = nickname;
    this.playerId = manualToken || 'p-' + Date.now(); 
    
    // Simulate checking local storage in mock
    if (!manualToken) {
        const existing = localStorage.getItem('faz_mock_token');
        if (!existing) {
            localStorage.setItem('faz_mock_token', 'mock-uuid-' + Date.now());
        }
    }
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
      currentWires: [],
      currentProb: 0,
      lastActionMessage: 'WAITING FOR PLAYERS...',
      isProcessing: false
    };

    this.notify();
    this.startBotSimulation();
  }

  async joinRoom(code: string, password?: string): Promise<void> {
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
        results: { losers: [], winners: [], survivors: [] },
        isProcessing: false
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
    // RESET GAME STATE
    this.room.phase = 'GAME_LOSER_ROUND';
    this.room.losersFound = 0;
    this.room.winnersFound = 0;
    this.room.results = { losers: [], winners: [], survivors: [] };
    this.room.players.forEach(p => p.status = 'PLAYING');
    this.room.currentTurnIndex = 0;
    this.room.lastActionMessage = "NEW GAME STARTED";
    
    this.startPhase(); 
    this.notify();
  }

  // --- Gameplay Logic ---

  spin() {
     if (!this.room) return;
     if (this.room.isProcessing) return; // Block input

     this.room.isProcessing = true;
     const player = this.room.players[this.room.currentTurnIndex];
     this.room.lastActionMessage = `${player.nickname} IS SPINNING...`;
     this.notify();

     // Match Server Delay Logic
     setTimeout(() => {
        if (!this.room) return;
        const hit = Math.random() < (this.room.currentProb || 0.1);
        this.room.turnResult = { hit };
        this.notify();

        setTimeout(() => {
            this.handleTurnResult(hit);
        }, 3000);
     }, 2000);
  }

  cutWire(wireId: number) {
      if (!this.room || !this.room.currentWires) return;
      if (this.room.isProcessing) return; // Block input
      
      const wire = this.room.currentWires.find(w => w.id === wireId);
      if (!wire || wire.status === 'cut') return;

      this.room.isProcessing = true;
      wire.status = 'cut';
      
      if (wire.isBomb) {
          this.room.turnResult = { hit: true };
          this.notify();
          setTimeout(() => {
              this.handleTurnResult(true);
          }, 3000);
      } else {
          this.room.currentProb = Math.min(0.99, (this.room.currentProb || 0.1) * wire.multiplier);
          this.room.lastActionMessage = "WIRE BYPASSED. ODDS INCREASED.";
          this.notify();

          setTimeout(() => {
              this.handleTurnResult(false);
          }, 2000);
      }
  }

  // --- Leaderboard ---
  
  async getLeaderboard(): Promise<PlayerStats[]> {
      // Sort desc
      return [...this.mockLeaderboard].sort((a, b) => b.high_score - a.high_score);
  }

  submitScore(score: number, stages: number = 0): void {
      console.log(`[Mock] Score submitted: ${score} (Stages: ${stages}) for ${this.nickname}`);
      
      const existingIdx = this.mockLeaderboard.findIndex(p => p.nickname === this.nickname);
      
      if (existingIdx !== -1) {
          // Update existing
          const entry = this.mockLeaderboard[existingIdx];
          entry.high_score = Math.max(entry.high_score, score);
          entry.wins += stages; // Accumulate stages as 'wins'
          entry.games_played++;
      } else {
          // Add new
          this.mockLeaderboard.push({
              nickname: this.nickname,
              high_score: score,
              wins: stages,
              losses: 0,
              games_played: 1
          });
      }
      
      // Keep only top 10
      this.mockLeaderboard.sort((a, b) => b.high_score - a.high_score);
      if (this.mockLeaderboard.length > 10) {
          this.mockLeaderboard.length = 10;
      }
  }

  sendTelemetry(action: string, details: any): void {
      console.log(`[Mock Telemetry] Action: ${action}`, details);
  }

  // --- Internals ---
  
  private startPhase() {
      if (!this.room) return;
      this.room.currentProb = this.room.phase === 'GAME_LOSER_ROUND' ? 0.10 : 0.15;
      
      const wireCount = 6;
      const newWires: Wire[] = Array.from({ length: wireCount }).map((_, i) => ({
        id: i,
        color: WIRE_COLORS[i % WIRE_COLORS.length],
        status: 'intact',
        isBomb: false,
        multiplier: 1.2 + Math.random() * 0.5, 
      }));

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
      
      this.ensureValidPlayer();
      this.prepareTurn();
  }

  private ensureValidPlayer() {
      if (!this.room) return;
      let loopCount = 0;
      
      if (this.room.currentTurnIndex >= this.room.players.length) {
          this.room.currentTurnIndex = 0;
      }
      
      while (
          (this.room.players[this.room.currentTurnIndex].status === 'ELIMINATED' || this.room.players[this.room.currentTurnIndex].status === 'WINNER') 
          && loopCount < this.room.players.length
      ) {
          this.room.currentTurnIndex = (this.room.currentTurnIndex + 1) % this.room.players.length;
          loopCount++;
      }
  }

  private prepareTurn() {
      if (!this.room) return;
      const player = this.room.players[this.room.currentTurnIndex];
      this.room.lastActionMessage = `${player.nickname}'S TURN`;
      this.room.turnStartTime = Date.now();
      this.room.turnResult = undefined;
      this.notify();
  }

  private handleTurnResult(hit: boolean) {
      if (!this.room) return;
      const player = this.room.players[this.room.currentTurnIndex];

      this.room.turnResult = undefined; 
      this.room.isProcessing = false; // UNLOCK
      
      console.log(`[Mock] Processing Turn: ${player.nickname}, Hit: ${hit}, Status: ${player.status}`);

      // Guard: If player already processed, ignore (prevent double push)
      if (player.status === 'ELIMINATED' || player.status === 'WINNER') {
          this.notify();
          return;
      }

      if (this.room.phase === 'GAME_LOSER_ROUND') {
          if (hit) {
              if (this.room.results.losers.some(l => l.id === player.id)) {
                  console.warn("Already in losers list");
                  return;
              }
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
              if (this.room.results.winners.some(w => w.id === player.id)) {
                  console.warn("Already in winners list");
                  return;
              }
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

      // Advance unless transition happened
      const transitioning = (this.room.phase === 'GAME_LOSER_ROUND' && hit && this.room.losersFound >= this.room.config.numLosers) ||
                            (this.room.phase === 'GAME_WINNER_ROUND' && hit && this.room.winnersFound >= this.room.config.numWinners);
                            
      if (this.room.phase !== 'RESULTS' && !transitioning) {
         this.advanceTurn();
      } else {
          this.notify();
      }
  }

  private advanceTurn() {
      if (!this.room) return;
      this.room.currentTurnIndex = (this.room.currentTurnIndex + 1) % this.room.players.length;
      this.advanceTurnLogic();
  }
  
  private advanceTurnLogic() {
      if (!this.room) return;
      this.ensureValidPlayer();
      this.prepareTurn();
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
              // Reset cycle to find first valid player
              this.startPhase(); 
          }
          this.notify();
      }, 3000);
  }

  private startBotSimulation() {
      if (this.botInterval) clearInterval(this.botInterval);
      this.botInterval = setInterval(() => this.botLoop(), 2000);
  }

  private stopBotSimulation() {
      if (this.botInterval) clearInterval(this.botInterval);
  }

  private botLoop() {
      if (!this.room) return;
      if (this.room.phase === 'LOBBY' && this.room.players.length < this.room.config.maxPlayers) {
          if (Math.random() > 0.7) return; 
          const bot: Player = {
              id: `bot-${Date.now()}-${Math.random()}`,
              nickname: MOCK_BOT_NAMES[Math.floor(Math.random() * MOCK_BOT_NAMES.length)],
              isHost: false,
              status: 'WAITING',
              avatarId: Math.floor(Math.random() * 6)
          };
          this.room.players.push(bot);
          this.notify();
      }
      if (this.room.phase.includes('GAME') && !this.room.turnResult && !this.room.isProcessing) {
          const activePlayer = this.room.players[this.room.currentTurnIndex];
          if (activePlayer.id === this.playerId) return; 
          
          if (activePlayer.status === 'ELIMINATED' || activePlayer.status === 'WINNER') return;

          if (Math.random() > 0.3) {
             this.spin();
          }
      }
  }
}