
import { MultiplayerRoom, Player, Wire } from './types';

const WIRE_COLORS = [
  'bg-red-800', 'bg-blue-800', 'bg-green-800', 'bg-yellow-700',
  'bg-purple-800', 'bg-orange-800', 'bg-gray-400', 'bg-pink-800',
];

export class GameLogic {
  
  static startGame(room: MultiplayerRoom) {
    // RESET GAME STATE
    room.phase = 'GAME_LOSER_ROUND';
    room.currentTurnIndex = 0;
    
    // Reset Counters
    room.losersFound = 0;
    room.winnersFound = 0;
    
    // Clear Results
    room.results = {
      losers: [],
      winners: [],
      survivors: []
    };
    
    // Reset Player Statuses
    room.players.forEach(p => p.status = 'PLAYING');
    
    // Reset Message
    room.lastActionMessage = "NEW GAME STARTED";

    this.startPhase(room);
  }

  static startPhase(room: MultiplayerRoom) {
      // 1. Reset Prob based on phase
      room.currentProb = room.phase === 'GAME_LOSER_ROUND' ? 0.10 : 0.15;

      // 2. Generate Wires (Once per phase)
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

      // 4. Ensure we start with a valid player
      // Important: We assume currentTurnIndex was reset to 0 by transitionPhase before calling this,
      // but ensureValidPlayer will scroll forward to the first NON-ELIMINATED player.
      this.ensureValidPlayer(room);
      this.prepareTurn(room);
  }

  static prepareTurn(room: MultiplayerRoom) {
      const player = room.players[room.currentTurnIndex];
      room.lastActionMessage = `${player.nickname}'S TURN`;
      room.turnStartTime = Date.now();
      room.turnResult = undefined;
  }

  static handleSpin(room: MultiplayerRoom): { hit: boolean, message: string } {
    const hit = Math.random() < (room.currentProb || 0.1);
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

  static processTurnResult(room: MultiplayerRoom, hit: boolean) {
      const player = room.players[room.currentTurnIndex];
      
      console.log(`[Logic] Processing Result for ${player.nickname}. Hit: ${hit}. Current Status: ${player.status}`);

      // Guard: If player is already processed (Eliminated/Winner), do not process again.
      // This prevents duplicate entries in the results array if called multiple times.
      if (player.status === 'ELIMINATED' || player.status === 'WINNER') {
          console.warn(`[Logic] Skipping duplicate process for ${player.nickname}`);
          return;
      }

      if (room.phase === 'GAME_LOSER_ROUND') {
          if (hit) {
              // Deduplication Check
              if (room.results.losers.some(l => l.id === player.id)) {
                  console.warn(`[Logic] Player ${player.nickname} already in losers list.`);
                  return;
              }

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
              // Deduplication Check
              if (room.results.winners.some(w => w.id === player.id)) {
                  console.warn(`[Logic] Player ${player.nickname} already in winners list.`);
                  return;
              }

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

      // If phase didn't change, advance turn
      // Note: If hit in winner round, but logic didn't trigger transition, we still advance turn (next winner chance)
      // Only advance if we are not transitioning
      const transitioning = (room.phase === 'GAME_LOSER_ROUND' && hit && room.losersFound >= room.config.numLosers) ||
                            (room.phase === 'GAME_WINNER_ROUND' && hit && room.winnersFound >= room.config.numWinners);
                            
      if (room.phase !== 'RESULTS' && !transitioning) {
          this.advanceTurn(room);
      }
  }

  private static ensureValidPlayer(room: MultiplayerRoom) {
      // Logic: Scroll forward until we find a player who is NOT Eliminated and NOT a Winner (if searching for active)
      
      let loopCount = 0;
      
      // Ensure we are in bounds (safety)
      if (room.currentTurnIndex >= room.players.length) {
          room.currentTurnIndex = 0;
      }

      while (
          (room.players[room.currentTurnIndex].status === 'ELIMINATED' || room.players[room.currentTurnIndex].status === 'WINNER') 
          && loopCount < room.players.length
      ) {
          room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
          loopCount++;
      }
      
      if (loopCount >= room.players.length) {
          console.error("No valid players left in rotation!");
          // Should handle this gracefully, maybe force end game
      }
  }

  private static advanceTurn(room: MultiplayerRoom) {
      // Move to next index
      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
      
      // Skip invalid players
      this.ensureValidPlayer(room);
      
      this.prepareTurn(room);
  }

  private static transitionPhase(room: MultiplayerRoom, phase: MultiplayerRoom['phase']) {
      room.lastActionMessage = phase === 'RESULTS' ? 'CALCULATING STATS...' : 'PHASE SHIFT INITIATED';
      
      // Delay actual transition handling to server timeout, but here we set up the state prep
      if (phase === 'RESULTS') {
          room.phase = phase;
          room.results.survivors = room.players.filter(p => p.status === 'PLAYING' || p.status === 'SAFE' || p.status === 'WAITING');
      } else {
          room.phase = phase;
          // IMPORTANT: Reset index to 0, then let ensureValidPlayer find the first actual survivor
          room.currentTurnIndex = 0;
          this.startPhase(room);
      }
  }
}
