import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, AlertTriangle, Zap, Coins, Scissors, RotateCcw } from 'lucide-react';
import { Reel } from './components/Reel';
import { Lever } from './components/Lever';
import { STAGES, SYMBOLS, WIRE_COLORS } from './constants';
import { StageConfig, Wire, SlotSymbol } from './types';

export default function App() {
  // --- Game State ---
  const [stageIndex, setStageIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'JACKPOT' | 'GAME_OVER'>('IDLE');
  const [view, setView] = useState<'front' | 'back'>('front');
  
  // Track if player has used their one-time revive
  const [hasRevived, setHasRevived] = useState(false);

  // --- Stage State ---
  const currentStage = STAGES[stageIndex] || STAGES[0];
  const [jackpotProb, setJackpotProb] = useState(currentStage.baseProb);
  const [wires, setWires] = useState<Wire[]>([]);
  
  // --- Spin State ---
  const [reelTargets, setReelTargets] = useState<[SlotSymbol, SlotSymbol, SlotSymbol] | null>(null);

  // --- UI State ---
  const [showWireModal, setShowWireModal] = useState<number | null>(null); // Wire ID
  const [message, setMessage] = useState<string>("");

  // Initialize wires for the stage
  const initStage = useCallback((stage: StageConfig) => {
    setJackpotProb(stage.baseProb);
    setMessage(`STAGE ${stage.id}: ${stage.name}`);
    
    // Generate Wires
    const newWires: Wire[] = Array.from({ length: stage.wireCount }).map((_, i) => ({
      id: i,
      color: WIRE_COLORS[i % WIRE_COLORS.length],
      status: 'intact',
      isBomb: false, // Will set one random bomb
      multiplier: 1.5 + Math.random(), // 1.5x to 2.5x
    }));

    // Pick one bomb
    const bombIndex = Math.floor(Math.random() * newWires.length);
    newWires[bombIndex].isBomb = true;
    
    setWires(newWires);
    setReelTargets(null);
  }, []);

  useEffect(() => {
    initStage(currentStage);
  }, [currentStage, initStage]);

  // --- Actions ---

  const handleSpin = () => {
    if (gameState !== 'IDLE') return;

    setGameState('SPINNING');
    setMessage("Spinning...");

    // Determine Outcome immediately
    const isJackpot = Math.random() < jackpotProb;

    setTimeout(() => {
      if (isJackpot) {
        // Target: 7-7-7
        const seven = SYMBOLS.find(s => s.id === 'seven')!;
        setReelTargets([seven, seven, seven]);
        
        setTimeout(() => {
          setGameState('JACKPOT');
          setTotalPoints(p => p + currentStage.jackpotReward);
          setMessage("JACKPOT!!! Moving to next stage...");
          
          setTimeout(() => {
             // Next Stage
             if (stageIndex + 1 < STAGES.length) {
               setStageIndex(prev => prev + 1);
               setGameState('IDLE');
               setView('front');
             } else {
               setMessage("YOU BEAT THE MACHINE! ULTIMATE VICTORY!");
               setGameState('GAME_OVER'); // Or victory state
             }
          }, 4000);
        }, 2000); // Time for reels to stop
      } else {
        // Target: Random losing combo (ensure not 7-7-7)
        let t1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        let t2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        let t3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        
        // Simple check to avoid accidental jackpot visual
        if (t1.id === 'seven' && t2.id === 'seven' && t3.id === 'seven') {
           t3 = SYMBOLS.find(s => s.id !== 'seven')!;
        }

        setReelTargets([t1, t2, t3]);
        
        setTimeout(() => {
          setGameState('IDLE');
          setTotalPoints(p => p + 1); // Pity point
          setMessage("No Luck. +1 Point.");
        }, 2000);
      }
    }, 1000); // Initial spin up time
  };

  const handleCutWire = (wireId: number) => {
    const wire = wires.find(w => w.id === wireId);
    if (!wire || wire.status === 'cut') return;

    if (wire.isBomb) {
      // GAME OVER
      setWires(prev => prev.map(w => w.id === wireId ? { ...w, status: 'cut' } : w));
      setGameState('GAME_OVER');
      setMessage("CRITICAL FAILURE. SYSTEM DESTROYED.");
      setView('front'); // Force front to show dead screen
    } else {
      // Boost Probability
      setWires(prev => prev.map(w => w.id === wireId ? { ...w, status: 'cut' } : w));
      setJackpotProb(prev => {
        const newProb = Math.min(0.99, prev * wire.multiplier); // Cap at 99%
        return newProb;
      });
      setMessage(`Security Bypassed! Probability increased to ${(jackpotProb * wire.multiplier * 100).toFixed(1)}%`);
      // Go back to front automatically
      setTimeout(() => {
        setView('front');
      }, 1500);
    }
    setShowWireModal(null);
  };

  const toggleView = () => {
    if (gameState === 'SPINNING' || gameState === 'GAME_OVER') return;
    setView(v => v === 'front' ? 'back' : 'front');
    setMessage(view === 'front' ? "Choose a wire carefully..." : "");
  };

  const startNewGame = () => {
    setStageIndex(0);
    setTotalPoints(0);
    setHasRevived(false);
    setGameState('IDLE');
    setView('front');
    initStage(STAGES[0]);
  };

  const handleRevive = () => {
    if (hasRevived) return;
    const newScore = Math.floor(totalPoints / 2);
    setTotalPoints(newScore);
    setHasRevived(true);
    setStageIndex(0);
    setGameState('IDLE');
    setView('front');
    initStage(STAGES[0]);
  };

  // --- Render Helpers ---

  const formatProb = (p: number) => {
    if (p < 0.01) return "< 1%";
    return `${(p * 100).toFixed(1)}%`;
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br ${currentStage.bgGradient} transition-colors duration-1000 overflow-hidden`}>
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-40 pointer-events-none">
         <div className="bg-black/50 p-4 rounded-lg border-2 border-slate-600 backdrop-blur-md">
            <h1 className="text-xl text-slate-300 font-retro mb-2">{currentStage.name}</h1>
            <div className="flex items-center gap-2 text-yellow-400">
               <Coins className="w-6 h-6" />
               <span className="text-2xl font-bold font-mono">{totalPoints.toLocaleString()} PTS</span>
            </div>
         </div>
      </div>

      {/* Main Machine Container */}
      <div className="relative w-[500px] h-[700px] perspective-1000 group">
        
        {/* Animated Container for Flip */}
        <motion.div 
          className="relative w-full h-full transition-all duration-700 transform-style-3d"
          animate={{ rotateY: view === 'back' ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 12 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          
          {/* ================= FRONT FACE ================= */}
          <div className={`absolute inset-0 backface-hidden rounded-3xl p-6 flex flex-col items-center shadow-2xl border-8 ${currentStage.accentColor} ${currentStage.primaryColor}`}>
             
             {/* Lever Attached to Front Face */}
             <Lever onPull={handleSpin} disabled={gameState !== 'IDLE'} />

             {/* Machine Header / Logo */}
             <div className="w-full bg-black/30 rounded-lg p-4 mb-6 text-center border-b-4 border-black/20">
               <h2 className="text-3xl font-retro text-white drop-shadow-md tracking-widest">JACKPOT-O-TRON</h2>
             </div>

             {/* Display Panel */}
             <div className="w-full bg-slate-900 rounded-lg border-4 border-slate-700 p-4 mb-6 grid grid-cols-2 gap-4 relative overflow-hidden">
               {gameState === 'GAME_OVER' && (
                 <div className="absolute inset-0 bg-red-900/90 z-20 flex items-center justify-center animate-pulse">
                   <span className="text-red-500 font-retro text-xl">TERMINATED</span>
                 </div>
               )}
               
               <div className="flex flex-col items-center justify-center border-r border-slate-700">
                 <span className="text-xs text-slate-400 uppercase">Jackpot Prob</span>
                 <span className={`text-2xl font-mono ${jackpotProb > 0.1 ? 'text-green-400' : 'text-red-400'}`}>
                   {formatProb(jackpotProb)}
                 </span>
               </div>
               <div className="flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400 uppercase">Status</span>
                  <span className="text-sm font-mono text-cyan-400 truncate w-full text-center">
                    {gameState === 'IDLE' ? 'READY' : gameState}
                  </span>
               </div>
             </div>

             {/* Message Bar */}
             <div className="h-8 mb-4 w-full flex items-center justify-center">
                <p className="font-mono text-sm text-yellow-200 animate-pulse text-center">{message}</p>
             </div>

             {/* Reels */}
             <div className="flex justify-center gap-2 bg-black p-4 rounded-lg border-4 border-slate-800 shadow-inner mb-8">
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[0] : null} delay={0} />
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[1] : null} delay={100} />
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[2] : null} delay={200} />
             </div>

             {/* Controls */}
             <div className="mt-auto w-full flex justify-end items-center px-4">
                {/* Arrow to turn machine */}
                <button 
                  onClick={toggleView}
                  disabled={gameState !== 'IDLE'}
                  className="p-4 bg-slate-700 hover:bg-slate-600 rounded-full border-4 border-slate-900 text-white shadow-lg transition-transform hover:rotate-12 active:scale-95 disabled:opacity-50"
                  title="Inspect Mechanism"
                >
                  <Settings className="w-8 h-8" />
                </button>
             </div>

          </div>

          {/* ================= BACK FACE ================= */}
          <div 
            className={`absolute inset-0 backface-hidden rotate-y-180 rounded-3xl p-6 flex flex-col items-center shadow-2xl border-8 ${currentStage.accentColor} bg-slate-800`}
            style={{ transform: 'rotateY(180deg)' }}
          >
             {/* Back Header */}
             <div className="w-full flex justify-between items-center mb-8 border-b-2 border-slate-600 pb-4">
                <h3 className="text-xl font-mono text-slate-300">MAINTENANCE PANEL</h3>
                <button onClick={toggleView} className="text-slate-400 hover:text-white">
                   <RotateCcw className="w-6 h-6" />
                </button>
             </div>

             <div className="w-full flex-1 relative bg-black/40 rounded-inner shadow-inner p-8 flex flex-col items-center justify-center gap-6 border border-slate-700">
                <p className="text-center text-sm text-slate-400 mb-4 font-mono">
                  <AlertTriangle className="inline w-4 h-4 text-yellow-500 mr-2" />
                  WARNING: TAMPERING MAY CAUSE SYSTEM FAILURE OR UNEXPECTED OPTIMIZATION.
                </p>

                {/* Wires */}
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  {wires.map((wire) => (
                    <div key={wire.id} className="relative group">
                       <button
                          onClick={() => wire.status === 'intact' && setShowWireModal(wire.id)}
                          disabled={wire.status === 'cut'}
                          className={`
                            relative w-full h-12 rounded-full shadow-md flex items-center justify-between px-6 transition-all
                            ${wire.status === 'cut' ? 'bg-slate-900 opacity-50 cursor-not-allowed' : `${wire.color} hover:brightness-110 cursor-pointer hover:scale-105`}
                          `}
                       >
                          <span className="bg-black/20 px-2 py-1 rounded text-xs font-mono font-bold text-white/80">
                            {wire.status === 'cut' ? 'SEVERED' : `WIRE-${100 + wire.id}`}
                          </span>
                          
                          {wire.status === 'intact' && (
                             <Scissors className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                          
                          {/* Cut Visual */}
                          {wire.status === 'cut' && (
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-800 rounded-full border-2 border-slate-600 flex items-center justify-center">
                               <Zap className="w-4 h-4 text-yellow-500" />
                            </div>
                          )}
                       </button>
                       {/* Wire Connectors Visuals */}
                       <div className="absolute -left-4 top-1/2 w-4 h-2 bg-gray-500 rounded-l" />
                       <div className="absolute -right-4 top-1/2 w-4 h-2 bg-gray-500 rounded-r" />
                    </div>
                  ))}
                </div>
             </div>

          </div>
        </motion.div>
      </div>

      {/* --- Confirmation Modal --- */}
      <AnimatePresence>
        {showWireModal !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          >
             <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-slate-800 border-2 border-red-500 rounded-lg p-6 max-w-sm w-full shadow-2xl"
             >
                <div className="flex items-center gap-3 text-red-500 mb-4">
                   <AlertTriangle className="w-8 h-8" />
                   <h3 className="text-xl font-bold font-retro">DANGER ZONE</h3>
                </div>
                <p className="text-slate-300 font-mono text-sm leading-relaxed mb-6">
                   Cutting this wire is <strong className="text-white">IRREVERSIBLE</strong>.
                   <br/><br/>
                   One wire will destroy the machine (GAME OVER). Others will rewire the logic gates to increase Jackpot probability.
                   <br/><br/>
                   Are you sure?
                </p>
                <div className="flex gap-4">
                   <button 
                     onClick={() => setShowWireModal(null)}
                     className="flex-1 py-3 bg-slate-700 text-white font-mono rounded hover:bg-slate-600"
                   >
                     CANCEL
                   </button>
                   <button 
                     onClick={() => showWireModal !== null && handleCutWire(showWireModal)}
                     className="flex-1 py-3 bg-red-600 text-white font-bold font-mono rounded hover:bg-red-500 flex justify-center items-center gap-2"
                   >
                     <Scissors className="w-4 h-4" /> CUT IT
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Game Over Modal --- */}
      <AnimatePresence>
        {gameState === 'GAME_OVER' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4"
          >
             <motion.div
               initial={{ scale: 0.8 }}
               animate={{ scale: 1 }}
               className="flex flex-col items-center text-center max-w-lg w-full"
             >
               <h2 className="text-6xl md:text-8xl text-red-600 font-retro mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(220,38,38,0.7)]">
                 GAME OVER
               </h2>
               <div className="mb-8 p-6 bg-slate-900 rounded-xl border-4 border-slate-700 w-full">
                 <p className="text-slate-400 font-mono mb-2 text-lg">FINAL SCORE</p>
                 <div className="text-4xl md:text-5xl text-yellow-400 font-retro tracking-widest">
                   {totalPoints.toLocaleString()}
                 </div>
               </div>
               
               <div className="flex flex-col gap-4 w-full">
                  {!hasRevived ? (
                    <button 
                       onClick={handleRevive}
                       className="w-full py-5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold font-retro rounded-lg border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all text-xl"
                    >
                       TRY AGAIN (Cost: {Math.floor(totalPoints/2)} pts)
                    </button>
                  ) : (
                    <div className="w-full py-4 bg-slate-800 text-slate-500 font-mono text-center border-2 border-slate-700 rounded-lg">
                      ONE-TIME REVIVE USED
                    </div>
                  )}

                  <button 
                     onClick={startNewGame}
                     className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-mono rounded-lg border-2 border-slate-600 transition-colors"
                  >
                     RESTART FROM SCRATCH (0 PTS)
                  </button>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}