
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Trophy, RotateCcw, User, ArrowLeft } from 'lucide-react';
import { Reel } from './Reel';
import { Lever } from './Lever';
import { SYMBOL_SETS, SPEED_CONFIG } from '../constants';
import { MultiplayerRoom, Player } from '../types';
import { soundEngine } from '../audio';

interface MultiplayerGameProps {
  room: MultiplayerRoom;
  currentPlayerId: string;
  updateRoom: (room: MultiplayerRoom) => void;
  onExit: () => void;
}

export const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ room, currentPlayerId, updateRoom, onExit }) => {
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'RESULT'>('IDLE');
  const [reelTargets, setReelTargets] = useState<any>(null);
  const [message, setMessage] = useState('');

  const currentPlayer = room.players.find(p => p.id === currentPlayerId);
  const activePlayerIndex = room.currentTurnIndex;
  const activePlayer = room.players[activePlayerIndex];
  const isMyTurn = activePlayer?.id === currentPlayerId;

  // Determine Symbols based on Phase
  const currentSymbols = useMemo(() => {
    if (room.phase === 'GAME_LOSER_ROUND') return SYMBOL_SETS['EXPLOSION'];
    return SYMBOL_SETS['ARCADE']; // Winner round uses standardish symbols
  }, [room.phase]);

  const jackpotSymbol = currentSymbols[currentSymbols.length - 1]; // Bomb or Prize

  // Bot logic or "Next Turn" simulator for demo
  useEffect(() => {
    if (gameState === 'IDLE' && activePlayer && !isMyTurn && room.phase.includes('GAME')) {
        // Simulate bot spin delay
        const timer = setTimeout(() => {
            handleSpin(true);
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [activePlayer, isMyTurn, gameState, room.phase]);

  const handleSpin = (isBot = false) => {
    if (gameState !== 'IDLE') return;
    
    setGameState('SPINNING');
    soundEngine.playSpin();
    setMessage(`${activePlayer?.nickname} IS SPINNING...`);

    // Determine outcome
    // Loser Round: 20% chance to explode (High stakes!)
    // Winner Round: 15% chance to win
    const prob = room.phase === 'GAME_LOSER_ROUND' ? 0.2 : 0.15;
    const hit = Math.random() < prob;

    setTimeout(() => {
        if (hit) {
            // JACKPOT (Either Bomb or Win)
            setReelTargets([jackpotSymbol, jackpotSymbol, jackpotSymbol]);
            setTimeout(() => {
                handleTurnResult(true);
            }, 1000); // Visual delay
        } else {
            // MISS
            // Generate random miss
            const r = () => currentSymbols[Math.floor(Math.random() * (currentSymbols.length - 1))];
            setReelTargets([r(), r(), r()]);
            setTimeout(() => {
                handleTurnResult(false);
            }, 1000);
        }
    }, SPEED_CONFIG['NORMAL'].totalDuration);
  };

  const handleTurnResult = (hit: boolean) => {
      setGameState('RESULT');
      const newRoom = { ...room };
      const player = newRoom.players[newRoom.currentTurnIndex];

      if (room.phase === 'GAME_LOSER_ROUND') {
          if (hit) {
              soundEngine.playJumpscare();
              setMessage(`${player.nickname} DETONATED!`);
              player.status = 'ELIMINATED';
              newRoom.losersFound++;
              newRoom.results.losers.push(player);
          } else {
              soundEngine.playClick(); // Safe click
              setMessage(`${player.nickname} IS SAFE.`);
          }

          // Check Phase Transition
          if (newRoom.losersFound >= newRoom.config.numLosers) {
              setTimeout(() => {
                  newRoom.phase = 'GAME_WINNER_ROUND';
                  // Reset turn to first non-eliminated player
                  advanceTurn(newRoom);
                  updateRoom(newRoom);
                  setGameState('IDLE');
                  setReelTargets(null);
                  soundEngine.playWarning(); // Phase change sound
              }, 2000);
              return;
          }

      } else if (room.phase === 'GAME_WINNER_ROUND') {
          if (hit) {
              soundEngine.playJackpot();
              setMessage(`${player.nickname} WON THE PRIZE!`);
              player.status = 'WINNER';
              newRoom.winnersFound++;
              newRoom.results.winners.push(player);
          } else {
             setMessage(`${player.nickname} MISSED.`);
          }

          // Check Game End
          if (newRoom.winnersFound >= newRoom.config.numWinners) {
              setTimeout(() => {
                  newRoom.phase = 'RESULTS';
                  // Fill survivors
                  newRoom.results.survivors = newRoom.players.filter(p => p.status === 'PLAYING' || p.status === 'SAFE' || p.status === 'WAITING');
                  updateRoom(newRoom);
                  setGameState('IDLE');
              }, 2000);
              return;
          }
      }

      // Next Turn logic
      setTimeout(() => {
          advanceTurn(newRoom);
          updateRoom(newRoom);
          setGameState('IDLE');
          setReelTargets(null);
      }, 1500);
  };

  const advanceTurn = (r: MultiplayerRoom) => {
      let nextIndex = (r.currentTurnIndex + 1) % r.players.length;
      // Find next eligible player
      let loopCount = 0;
      while (
          (r.players[nextIndex].status === 'ELIMINATED' || r.players[nextIndex].status === 'WINNER') 
          && loopCount < r.players.length
      ) {
          nextIndex = (nextIndex + 1) % r.players.length;
          loopCount++;
      }
      r.currentTurnIndex = nextIndex;
  };

  // --- RESULTS SCREEN ---
  if (room.phase === 'RESULTS') {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white font-mono p-4">
              <h1 className="text-4xl retro-font text-yellow-500 mb-8">SESSION REPORTS</h1>
              
              <div className="grid md:grid-cols-3 gap-4 w-full max-w-4xl">
                  {/* Losers */}
                  <div className="bg-red-950/20 border border-red-900 p-4">
                      <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2"><Skull /> CASUALTIES</h3>
                      {room.results.losers.map(p => (
                          <div key={p.id} className="p-2 bg-black/50 mb-2 border-l-2 border-red-500">{p.nickname}</div>
                      ))}
                  </div>
                   {/* Winners */}
                   <div className="bg-green-950/20 border border-green-900 p-4">
                      <h3 className="text-green-500 font-bold mb-4 flex items-center gap-2"><Trophy /> WINNERS</h3>
                      {room.results.winners.map(p => (
                          <div key={p.id} className="p-2 bg-black/50 mb-2 border-l-2 border-green-500">{p.nickname}</div>
                      ))}
                  </div>
                   {/* Survivors */}
                   <div className="bg-zinc-900/20 border border-zinc-700 p-4">
                      <h3 className="text-zinc-500 font-bold mb-4 flex items-center gap-2"><User /> SURVIVORS</h3>
                      {room.results.survivors.map(p => (
                          <div key={p.id} className="p-2 bg-black/50 mb-2 border-l-2 border-zinc-500">{p.nickname}</div>
                      ))}
                  </div>
              </div>

              <div className="mt-8 flex gap-4">
                  <button onClick={onExit} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600">LEAVE LOBBY</button>
                  {/* Replay logic would reset room state but keep players */}
                  <button onClick={() => {
                      // Simple restart mock
                      const newRoom = {...room};
                      newRoom.phase = 'GAME_LOSER_ROUND';
                      newRoom.losersFound = 0;
                      newRoom.winnersFound = 0;
                      newRoom.results = { losers: [], winners: [], survivors: [] };
                      newRoom.players.forEach(p => p.status = 'PLAYING');
                      updateRoom(newRoom);
                  }} className="px-6 py-3 bg-yellow-900/20 hover:bg-yellow-900/40 border border-yellow-600 text-yellow-500">SAME PLAYERS RESTART</button>
              </div>
          </div>
      );
  }

  // --- GAMEPLAY SCREEN ---
  return (
    <div className="min-h-screen w-full flex bg-zinc-950 overflow-hidden relative">
       {/* Sidebar Player List */}
       <div className="w-24 md:w-64 bg-black border-r border-zinc-800 p-2 flex flex-col gap-2 z-20 overflow-y-auto">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-2 text-center md:text-left">Roster</div>
          {room.players.map((p, idx) => (
              <div key={p.id} className={`
                p-2 border text-xs md:text-sm relative transition-all
                ${p.id === activePlayer.id ? 'bg-zinc-800 border-yellow-500 scale-105 z-10' : 'bg-black border-zinc-800 opacity-70'}
                ${p.status === 'ELIMINATED' ? 'grayscale opacity-30 border-red-900' : ''}
                ${p.status === 'WINNER' ? 'border-green-500 bg-green-900/10' : ''}
              `}>
                  <div className="font-bold truncate">{p.nickname}</div>
                  <div className="text-[10px] uppercase">
                      {p.status === 'ELIMINATED' ? 'TERMINATED' : p.status === 'WINNER' ? 'EXTRACTED' : idx === room.currentTurnIndex ? 'ACTIVE' : 'WAITING'}
                  </div>
                  {idx === room.currentTurnIndex && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 animate-pulse" />}
              </div>
          ))}
       </div>

       {/* Main Game Area */}
       <div className="flex-1 relative flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 left-4 z-30">
             <button onClick={onExit} className="text-zinc-600 hover:text-white flex items-center gap-2 text-xs"><ArrowLeft className="w-4 h-4" /> QUIT</button>
          </div>

          <div className="mb-4 text-center z-20">
              <h2 className="text-2xl retro-font text-yellow-500">
                  {room.phase === 'GAME_LOSER_ROUND' ? 'PHASE 1: ELIMINATION' : 'PHASE 2: EXTRACTION'}
              </h2>
              <p className="text-green-500 font-mono animate-pulse">{message || 'WAITING FOR INPUT...'}</p>
          </div>

          <div className="relative w-[300px] h-[400px] bg-zinc-900 border-4 border-black shadow-2xl flex flex-col items-center p-4">
              {/* Visual Indicator of Mode */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 px-3 py-1 text-xs text-white">
                  TARGET: {room.phase === 'GAME_LOSER_ROUND' ? 'AVOID BOMB' : 'HIT JACKPOT'}
              </div>

              <div className="flex gap-1 mb-4 border-4 border-black bg-black p-2">
                 <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[0] : null} delay={0} symbols={currentSymbols} speed="FAST" />
                 <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[1] : null} delay={100} symbols={currentSymbols} speed="FAST" />
                 <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[2] : null} delay={200} symbols={currentSymbols} speed="FAST" />
              </div>

              {/* Only show lever if it's MY turn */}
              <div className="absolute right-[-40px] top-[100px] scale-75">
                  <Lever 
                     onPull={() => handleSpin()} 
                     disabled={gameState !== 'IDLE' || !isMyTurn} 
                     speed="FAST" 
                  />
              </div>

              <div className="mt-auto w-full bg-black border border-zinc-800 p-2 text-center text-xs text-zinc-500">
                  {isMyTurn ? "YOUR TURN - PULL LEVER" : `WAITING FOR ${activePlayer.nickname}...`}
              </div>
          </div>
       </div>
    </div>
  );
};
