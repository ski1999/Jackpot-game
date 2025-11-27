
import { MultiplayerRoom, Player, Wire } from './types';

const WIRE_COLORS = [
  'bg-red-800', 'bg-blue-800', 'bg-green-800', 'bg-yellow-700',
  'bg-purple-800', 'bg-orange-800', 'bg-gray-400', 'bg-pink-800',
];

export class GameLogic {
  
  static startGame(room: MultiplayerRoom) {
    room.phase = 'GAME_LOSER_ROUND';
    room.players.forEach(p => p.status = 'PLAYING');
    room.currentTurnIndex = 0;
    this.initTurn(room);
  }

  static handleSpin(room: MultiplayerRoom): { hit: boolean, message: string } {
    const hit = Math.random() < (room.currentProb || 0.1);
    
    // Logic handles the "Result" but the transition happens after animation delay
    // handled by the caller (Server) via timeouts, or we can just update state here
    // and let client animate.
    // For simplicity, we return the result, and server updates state immediately.
    
    return { hit, message: hit ? 'HIT!' : 'SAFE' };
  }

  static handleWireCut(room: MultiplayerRoom, wireId: number): { hit: boolean, message: string } | null {
    if (!room.currentWires) return null;
    const wire = room.currentWires.find(w => w.id === wireId);
    if (!wire || wire.status === 'cut') return null;

    wire.status = 'cut';

    if (wire.isBomb) {
       return { hit: true, message: 'TRAP TRIGGERED!' };
    } else {
       room.currentProb = Math.min(0.99, (room.currentProb || 0.1) * wire.multiplier);
       return { hit: false, message: 'ODDS INCREASED' };
    }
  }

  static initTurn(room: MultiplayerRoom) {
      const player = room.players[room.currentTurnIndex];
      room.lastActionMessage = `${player.nickname}'S TURN`;
      
      // TELEMETRY: Track when the turn started
      room.turnStartTime = Date.now();

      // 1. Set Prob
      room.currentProb = room.phase === 'GAME_LOSER_ROUND' ? 0.10 : 0.15;

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
      if (room.phase === 'GAME_LOSER_ROUND') {
          // 2 Bombs
          let bombsPlaced = 0;
          while (bombsPlaced < 2) {
              const idx = Math.floor(Math.random() * wireCount);
              if (!newWires[idx].isBomb) {
                  newWires[idx].isBomb = true;
                  bombsPlaced++;
              }
          }
      } else {
          // 1 Bomb
          const trapIndex = Math.floor(Math.random() * wireCount);
          newWires[trapIndex].isBomb = true;
      }
      room.currentWires = newWires;
      room.turnResult = undefined;
  }

  static processTurnResult(room: MultiplayerRoom, hit: boolean) {
      const player = room.players[room.currentTurnIndex];
      
      if (room.phase === 'GAME_LOSER_ROUND') {
          if (hit) {
              player.status = 'ELIMINATED';
              room.losersFound++;
              room.results.losers.push(player);
              room.lastActionMessage = `${player.nickname} ELIMINATED!`;
          } else {
              room.lastActionMessage = `${player.nickname} SURVIVED.`;
          }

          if (room.losersFound >= room.config.numLosers) {
              this.transitionPhase(room, 'GAME_WINNER_ROUND');
              return;
          }
      } else if (room.phase === 'GAME_WINNER_ROUND') {
          if (hit) {
              player.status = 'WINNER';
              room.winnersFound++;
              room.results.winners.push(player);
              room.lastActionMessage = `${player.nickname} WON!`;
          } else {
              room.lastActionMessage = `${player.nickname} NO PRIZE.`;
          }

          if (room.winnersFound >= room.config.numWinners) {
              this.transitionPhase(room, 'RESULTS');
              return;
          }
      }

      this.advanceTurn(room);
  }

  private static advanceTurn(room: MultiplayerRoom) {
      let nextIndex = (room.currentTurnIndex + 1) % room.players.length;
      let loopCount = 0;
      // Skip eliminated/won players
      while (
          (room.players[nextIndex].status === 'ELIMINATED' || room.players[nextIndex].status === 'WINNER') 
          && loopCount < room.players.length
      ) {
          nextIndex = (nextIndex + 1) % room.players.length;
          loopCount++;
      }
      room.currentTurnIndex = nextIndex;
      this.initTurn(room);
  }

  private static transitionPhase(room: MultiplayerRoom, phase: MultiplayerRoom['phase']) {
      room.lastActionMessage = phase === 'RESULTS' ? 'CALCULATING STATS...' : 'PHASE SHIFT INITIATED';
      
      // Note: In a real server, we might want to delay the actual phase change logic
      // but keeping state clean, we set it now. Ideally we use a "Transitioning" state.
      
      if (phase === 'RESULTS') {
          room.phase = phase;
          room.results.survivors = room.players.filter(p => p.status === 'PLAYING' || p.status === 'SAFE' || p.status === 'WAITING');
      } else {
          room.phase = phase;
          room.currentTurnIndex = 0;
          this.initTurn(room);
      }
  }
}
