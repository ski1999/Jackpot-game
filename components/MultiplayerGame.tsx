
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Trophy, User, ArrowLeft, Wrench, RotateCcw, Zap, AlertTriangle, Scissors, Ticket } from 'lucide-react';
import { Reel } from './Reel';
import { Lever } from './Lever';
import { SYMBOL_SETS, SPEED_CONFIG, WIRE_COLORS } from '../constants';
import { MultiplayerRoom, Wire } from '../types';
import { soundEngine } from '../audio';
import { PixelSymbol } from './PixelSymbol';

interface MultiplayerGameProps {
  room: MultiplayerRoom;
  currentPlayerId: string;
  updateRoom: (room: MultiplayerRoom) => void;
  onExit: () => void;
}

export const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ room, currentPlayerId, updateRoom, onExit }) => {
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'RESULT'>('IDLE');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [reelTargets, setReelTargets] = useState<any>(null);
  const [message, setMessage] = useState('');
  
  // Turn State
  const [wires, setWires] = useState<Wire[]>([]);
  const [currentProb, setCurrentProb] = useState(0);
  const [turnHit, setTurnHit] = useState(false); // Did the last spin result in a hit?

  const currentPlayer = room.players.find(p => p.id === currentPlayerId);
  const activePlayerIndex = room.currentTurnIndex;
  const activePlayer = room.players[activePlayerIndex];
  const isMyTurn = activePlayer?.id === currentPlayerId;

  // Symbols based on Phase
  const currentSymbols = useMemo(() => {
    if (room.phase === 'GAME_LOSER_ROUND') return SYMBOL_SETS['EXPLOSION'];
    return SYMBOL_SETS['PRIZE'];
  }, [room.phase]);

  const jackpotSymbol = currentSymbols[currentSymbols.length - 1]; // Bomb or Ticket

  // Initialize Turn (Wires & Prob)
  useEffect(() => {
    // Reset View to front on new turn
    setView('front');
    
    // Base Prob: Loser (10% to explode), Winner (15% to win)
    const baseProb = room.phase === 'GAME_LOSER_ROUND' ? 0.10 : 0.15;
    setCurrentProb(baseProb);

    // Generate Wires for this turn
    const wireCount = 6;
    const newWires: Wire[] = Array.from({ length: wireCount }).map((_, i) => ({
      id: i,
      color: WIRE_COLORS[i % WIRE_COLORS.length],
      status: 'intact',
      isBomb: false,
      // Always increase probability. In Loser round this is bad (Higher Boom risk). In Winner it is good (Higher Win chance).
      multiplier: 1.2 + Math.random() * 0.5, 
    }));

    // Trap Generation
    if (room.phase === 'GAME_LOSER_ROUND') {
        // Loser Round: 2 Bombs (High Risk)
        let bombsPlaced = 0;
        while (bombsPlaced < 2) {
            const idx = Math.floor(Math.random() * wireCount);
            if (!newWires[idx].isBomb) {
                newWires[idx].isBomb = true;
                bombsPlaced++;
            }
        }
    } else {
        // Winner Round: 1 Bomb
        const trapIndex = Math.floor(Math.random() * wireCount);
        newWires[trapIndex].isBomb = true;
    }
    
    setWires(newWires);
    
    if (activePlayer) {
       setMessage(`${activePlayer.nickname}'S TURN`);
    }

  }, [room.currentTurnIndex, room.phase, activePlayer]);

  // Bot Logic
  useEffect(() => {
    if (gameState === 'IDLE' && activePlayer && !isMyTurn && room.phase.includes('GAME')) {
        // Simulate bot thinking/action
        const actionTimer = setTimeout(() => {
            // Bot decision:
            // In Loser Round: Hacking increases risk, so bots should rarely do it (bad strategy), or do it to be chaotic.
            // In Winner Round: Hacking increases win chance, bots should do it more often.
            const hackChance = room.phase === 'GAME_LOSER_ROUND' ? 0.2 : 0.6;

            if (Math.random() < hackChance) {
                // Visualize "Bot is hacking"
                setMessage(`${activePlayer.nickname} IS TAMPERING...`);
                soundEngine.playClick();
                
                // Simulate prob change
                setTimeout(() => {
                   const modifier = 1.3; // Simulating the average wire multiplier
                   // Chance bot hits trap (Higher in Loser round due to 2 bombs)
                   const trapChance = room.phase === 'GAME_LOSER_ROUND' ? 0.33 : 0.16;
                   
                   if (Math.random() < trapChance) {
                       handleTurnResult(true); // Instant Fail
                       return;
                   }
                   setCurrentProb(p => Math.min(0.99, p * modifier));
                   // Then spin
                   setTimeout(() => handleSpin(), 1000);
                }, 1000);
            } else {
                handleSpin();
            }
        }, 1500);
        return () => clearTimeout(actionTimer);
    }
  }, [activePlayer, isMyTurn, gameState, room.phase]);

  const handleCutWire = (wireId: number) => {
      const wire = wires.find(w => w.id === wireId);
      if (!wire || wire.status === 'cut') return;

      setWires(prev => prev.map(w => w.id === wireId ? { ...w, status: 'cut' } : w));
      soundEngine.playClick();

      if (wire.isBomb) {
          // TRAP: Instant "Hit" (Explosion in Loser, or 'Elimination' in Winner)
          soundEngine.playJumpscare();
          setMessage("CRITICAL FAILURE! SHORT CIRCUIT!");
          setView('front');
          handleTurnResult(true);
      } else {
          // Safe Wire
          setCurrentProb(prev => Math.min(0.99, prev * wire.multiplier));
          soundEngine.playWarning(); // Feedback sound
      }
  };

  const handleSpin = () => {
    if (gameState !== 'IDLE') return;
    
    setGameState('SPINNING');
    soundEngine.playSpin();
    setMessage(`${activePlayer?.nickname} IS SPINNING...`);
    setView('front');

    const hit = Math.random() < currentProb;
    setTurnHit(hit);

    setTimeout(() => {
        if (hit) {
            setReelTargets([jackpotSymbol, jackpotSymbol, jackpotSymbol]);
            setTimeout(() => {
                handleTurnResult(true);
            }, 500);
        } else {
            const r = () => currentSymbols[Math.floor(Math.random() * (currentSymbols.length - 1))];
            setReelTargets([r(), r(), r()]);
            setTimeout(() => {
                handleTurnResult(false);
            }, 500);
        }
    }, SPEED_CONFIG['FAST'].totalDuration);
  };

  const handleTurnResult = (hit: boolean) => {
      setGameState('RESULT');
      const newRoom = { ...room };
      const player = newRoom.players[newRoom.currentTurnIndex];

      if (room.phase === 'GAME_LOSER_ROUND') {
          if (hit) {
              soundEngine.playJumpscare();
              setMessage(`${player.nickname} ELIMINATED!`);
              player.status = 'ELIMINATED';
              newRoom.losersFound++;
              newRoom.results.losers.push(player);
          } else {
              setMessage(`${player.nickname} SURVIVED.`);
          }

          if (newRoom.losersFound >= newRoom.config.numLosers) {
              setTimeout(() => {
                  newRoom.phase = 'GAME_WINNER_ROUND';
                  advanceTurn(newRoom);
                  updateRoom(newRoom);
                  setGameState('IDLE');
                  setReelTargets(null);
              }, 4000); // Wait for drawer animation
              return;
          }

      } else if (room.phase === 'GAME_WINNER_ROUND') {
          if (hit) {
              soundEngine.playJackpot();
              setMessage(`${player.nickname} WON!`);
              player.status = 'WINNER';
              newRoom.winnersFound++;
              newRoom.results.winners.push(player);
          } else {
             setMessage(`${player.nickname} NO PRIZE.`);
          }

          if (newRoom.winnersFound >= newRoom.config.numWinners) {
              setTimeout(() => {
                  newRoom.phase = 'RESULTS';
                  newRoom.results.survivors = newRoom.players.filter(p => p.status === 'PLAYING' || p.status === 'SAFE' || p.status === 'WAITING');
                  updateRoom(newRoom);
                  setGameState('IDLE');
              }, 4000);
              return;
          }
      }

      setTimeout(() => {
          advanceTurn(newRoom);
          updateRoom(newRoom);
          setGameState('IDLE');
          setReelTargets(null);
      }, 3000);
  };

  const advanceTurn = (r: MultiplayerRoom) => {
      let nextIndex = (r.currentTurnIndex + 1) % r.players.length;
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

  const toggleView = () => {
    if (gameState !== 'IDLE' || !isMyTurn) return;
    soundEngine.playClick();
    setView(v => v === 'front' ? 'back' : 'front');
  };

  const formatProb = (p: number) => (p * 100).toFixed(0) + '%';

  // --- RESULTS SCREEN ---
  if (room.phase === 'RESULTS') {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white font-mono p-4">
              <h1 className="text-4xl retro-font text-yellow-500 mb-8">SESSION REPORTS</h1>
              <div className="grid md:grid-cols-3 gap-4 w-full max-w-4xl">
                  <div className="bg-red-950/20 border border-red-900 p-4">
                      <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2"><Skull /> CASUALTIES</h3>
                      {room.results.losers.map(p => <div key={p.id} className="p-2 bg-black/50 mb-2 border-l-2 border-red-500">{p.nickname}</div>)}
                  </div>
                   <div className="bg-green-950/20 border border-green-900 p-4">
                      <h3 className="text-green-500 font-bold mb-4 flex items-center gap-2"><Trophy /> WINNERS</h3>
                      {room.results.winners.map(p => <div key={p.id} className="p-2 bg-black/50 mb-2 border-l-2 border-green-500">{p.nickname}</div>)}
                  </div>
                   <div className="bg-zinc-900/20 border border-zinc-700 p-4">
                      <h3 className="text-zinc-500 font-bold mb-4 flex items-center gap-2"><User /> SURVIVORS</h3>
                      {room.results.survivors.map(p => <div key={p.id} className="p-2 bg-black/50 mb-2 border-l-2 border-zinc-500">{p.nickname}</div>)}
                  </div>
              </div>
              <div className="mt-8 flex gap-4">
                  <button onClick={onExit} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600">LEAVE LOBBY</button>
                  <button onClick={() => {
                      const newRoom = {...room};
                      newRoom.phase = 'GAME_LOSER_ROUND';
                      newRoom.losersFound = 0;
                      newRoom.winnersFound = 0;
                      newRoom.results = { losers: [], winners: [], survivors: [] };
                      newRoom.players.forEach(p => p.status = 'PLAYING');
                      updateRoom(newRoom);
                  }} className="px-6 py-3 bg-yellow-900/20 hover:bg-yellow-900/40 border border-yellow-600 text-yellow-500">RESTART</button>
              </div>
          </div>
      );
  }

  // --- GAMEPLAY SCREEN ---
  return (
    <div className="min-h-screen w-full flex bg-zinc-950 overflow-hidden relative">
       {/* Sidebar */}
       <div className="w-24 md:w-64 bg-black border-r border-zinc-800 p-2 flex flex-col gap-2 z-20 overflow-y-auto">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-2 text-center md:text-left">Roster</div>
          {room.players.map((p, idx) => (
              <div key={p.id} className={`p-2 border text-xs md:text-sm relative transition-all ${p.id === activePlayer.id ? 'bg-zinc-800 border-yellow-500 scale-105 z-10' : 'bg-black border-zinc-800 opacity-70'} ${p.status === 'ELIMINATED' ? 'grayscale opacity-30 border-red-900' : ''} ${p.status === 'WINNER' ? 'border-green-500 bg-green-900/10' : ''}`}>
                  <div className="font-bold truncate">{p.nickname}</div>
                  <div className="text-[10px] uppercase">{p.status === 'ELIMINATED' ? 'TERMINATED' : p.status === 'WINNER' ? 'EXTRACTED' : idx === room.currentTurnIndex ? 'ACTIVE' : 'WAITING'}</div>
              </div>
          ))}
       </div>

       {/* Main Game Area */}
       <div className="flex-1 relative flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 left-4 z-30">
             <button onClick={onExit} className="text-zinc-600 hover:text-white flex items-center gap-2 text-xs"><ArrowLeft className="w-4 h-4" /> QUIT</button>
          </div>

          <div className="mb-4 text-center z-20">
              <h2 className="text-xl md:text-3xl retro-font text-yellow-500 drop-shadow-lg">
                  {room.phase === 'GAME_LOSER_ROUND' ? 'PHASE 1: ELIMINATION' : 'PHASE 2: EXTRACTION'}
              </h2>
              <p className="text-green-500 font-mono animate-pulse">{message || 'WAITING...'}</p>
          </div>

          {/* 3D Machine Wrapper */}
          <div className="relative w-[340px] md:w-[400px] h-[600px] perspective-1000 group z-20">
             <motion.div 
               className="relative w-full h-full transition-all duration-700 transform-style-3d"
               animate={{ rotateY: view === 'back' ? 180 : 0 }}
               style={{ transformStyle: 'preserve-3d' }}
             >
                {/* FRONT */}
                <div className="absolute inset-0 backface-hidden p-4 flex flex-col items-center shadow-2xl bg-zinc-900 border-x-8 border-y-8 border-black">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')] opacity-30 pointer-events-none" />
                    
                    {/* Prob Display */}
                    <div className="w-full bg-black border-4 border-zinc-800 p-2 mb-2 text-center font-mono relative overflow-hidden">
                       <div className="absolute inset-0 bg-green-500/5 pointer-events-none"></div>
                       <div className="text-[10px] text-zinc-500 uppercase">
                           {room.phase === 'GAME_LOSER_ROUND' ? 'EXPLOSION RISK' : 'WIN CHANCE'}
                       </div>
                       <div className={`text-3xl retro-font ${room.phase === 'GAME_LOSER_ROUND' ? 'text-red-600' : 'text-green-400'} text-glow`}>
                           {formatProb(currentProb)}
                       </div>
                    </div>

                    {/* Reels */}
                    <div className="flex justify-center gap-1 bg-zinc-950 p-2 border-4 border-black mb-2">
                       <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[0] : null} delay={0} symbols={currentSymbols} speed="FAST" />
                       <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[1] : null} delay={100} symbols={currentSymbols} speed="FAST" />
                       <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[2] : null} delay={200} symbols={currentSymbols} speed="FAST" />
                    </div>

                    {/* Controls */}
                    <div className="w-full flex justify-between items-center px-2 mt-2">
                       <div className="text-[10px] text-zinc-500">
                          {isMyTurn ? "YOUR TURN" : "OBSERVING..."}
                       </div>
                       {isMyTurn && gameState === 'IDLE' && (
                         <button onClick={toggleView} className="p-2 bg-zinc-800 border-2 border-black text-white active:scale-95 flex items-center gap-2">
                            <span className="text-[10px] hidden md:inline">HACK PANEL</span>
                            <Wrench className="w-4 h-4" />
                         </button>
                       )}
                    </div>
                    
                    {/* Lever */}
                    <div className="absolute right-[-60px] top-[150px] scale-75">
                       <Lever onPull={handleSpin} disabled={gameState !== 'IDLE' || !isMyTurn} speed="FAST" />
                    </div>

                    {/* Prize Drawer */}
                    <div className="w-full mt-auto h-24 bg-zinc-950 border-t-4 border-black relative flex justify-center items-end shadow-inner">
                        <div className="w-3/4 h-16 bg-zinc-800 border-x-4 border-t-4 border-black rounded-t-lg relative flex justify-center items-center overflow-visible shadow-lg">
                             <div className="w-3/4 h-3 bg-black rounded-full shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)] translate-y-3 border-b border-zinc-700 relative z-10"></div>
                             <AnimatePresence>
                                {gameState === 'RESULT' && turnHit && room.phase === 'GAME_LOSER_ROUND' && (
                                   <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: -30, opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-4 flex flex-col items-center z-0">
                                       <div className="relative">
                                          <PixelSymbol shape={SYMBOL_SETS['EXPLOSION'][3].shape} color="#ef4444" size={64} />
                                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ repeat: Infinity, duration: 0.5 }} className="absolute inset-0 bg-red-500 rounded-full blur-xl" />
                                       </div>
                                       {/* Smoke */}
                                       {Array.from({ length: 10 }).map((_, i) => (
                                          <motion.div key={i} initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: (Math.random() - 0.5) * 100, y: -50 - Math.random() * 50, opacity: [0, 1, 0] }} transition={{ duration: 1, delay: Math.random() * 0.5 }} className="absolute w-4 h-4 bg-gray-500 rounded-full blur-sm" />
                                       ))}
                                   </motion.div>
                                )}
                                {gameState === 'RESULT' && turnHit && room.phase === 'GAME_WINNER_ROUND' && (
                                   <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: -40, opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-4 flex flex-col items-center z-0">
                                       <div className="animate-bounce">
                                          <PixelSymbol shape={SYMBOL_SETS['PRIZE'][3].shape} color="#eab308" size={64} />
                                       </div>
                                       {/* Confetti */}
                                       {Array.from({ length: 20 }).map((_, i) => (
                                          <motion.div key={i} initial={{ x: 0, y: 0 }} animate={{ x: (Math.random() - 0.5) * 150, y: -100 - Math.random() * 50, rotate: 360 }} transition={{ duration: 1.5 }} className={`absolute w-2 h-2 rounded-sm ${['bg-red-500', 'bg-blue-500', 'bg-yellow-500'][i % 3]}`} />
                                       ))}
                                   </motion.div>
                                )}
                             </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* BACK */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 p-6 flex flex-col items-center shadow-2xl bg-zinc-900 border-8 border-black" style={{ transform: 'rotateY(180deg)' }}>
                    <div className="w-full flex justify-between items-center mb-6 border-b-2 border-zinc-700 pb-4 z-10">
                        <h3 className="text-sm text-yellow-600 flex items-center gap-2 font-mono uppercase">
                           {room.phase === 'GAME_LOSER_ROUND' ? 'VOLTAGE BOOSTER' : 'ODDS MODIFIER'}
                        </h3>
                        <button onClick={toggleView} className="text-zinc-400 p-2 bg-black border border-zinc-700"><RotateCcw className="w-4 h-4" /></button>
                    </div>
                    <div className="w-full flex-1 relative bg-black/80 shadow-inner p-4 flex flex-col items-center justify-start gap-3 border-4 border-zinc-800 z-10 overflow-y-auto">
                        {wires.map((wire) => (
                          <div key={wire.id} className="relative w-full">
                             <button 
                                onClick={() => handleCutWire(wire.id)} 
                                disabled={wire.status === 'cut' || !isMyTurn} 
                                className={`w-full h-8 border-b-2 flex items-center justify-between px-4 transition-all ${wire.status === 'cut' ? 'bg-black border-zinc-800 text-zinc-700' : `${wire.color} border-black shadow-md active:translate-y-1`}`}
                             >
                                <span className={`text-[10px] font-bold font-mono ${wire.status === 'cut' ? 'line-through' : 'text-white'}`}>{wire.status === 'cut' ? 'SEVERED' : `WIRE_${100 + wire.id}`}</span>
                                {wire.status === 'intact' && <Scissors className="w-3 h-3 text-white opacity-50" />}
                                {wire.status === 'cut' && <Zap className="w-3 h-3 text-yellow-900" />}
                             </button>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4 text-[10px] text-zinc-500 text-center">
                        {room.phase === 'GAME_LOSER_ROUND' ? "WARNING: CUTTING WIRES INCREASES EXPLOSION RISK. DANGER." : "CUT WIRES TO INCREASE WIN CHANCE. BEWARE TRAPS."}
                    </div>
                </div>
             </motion.div>
          </div>
       </div>
    </div>
  );
};
