import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, AlertTriangle, Zap, Coins, Scissors, RotateCcw, Skull, Trophy } from 'lucide-react';
import { Reel } from './components/Reel';
import { Lever } from './components/Lever';
import { STAGES, SYMBOL_SETS, WIRE_COLORS } from './constants';
import { StageConfig, Wire, SlotSymbol } from './types';

export default function App() {
  // --- Game State ---
  const [stageIndex, setStageIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'JACKPOT' | 'GAME_OVER' | 'VICTORY'>('IDLE');
  const [view, setView] = useState<'front' | 'back'>('front');
  
  // Track if player has used their one-time revive
  const [hasRevived, setHasRevived] = useState(false);

  // --- Stage State ---
  const currentStage = STAGES[stageIndex] || STAGES[0];
  const currentSymbols = useMemo(() => SYMBOL_SETS[currentStage.symbolSetId] || SYMBOL_SETS['CLASSIC'], [currentStage]);
  
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
    setMessage(`${stage.name}`);
    
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

  // Initialize on stage change
  useEffect(() => {
    initStage(currentStage);
  }, [stageIndex, initStage]); // Only re-init when stageIndex changes explicitly

  // --- Actions ---

  const handleSpin = () => {
    if (gameState !== 'IDLE') return;

    setGameState('SPINNING');
    setMessage("ROLLING...");

    // Determine Outcome immediately
    const isJackpot = Math.random() < jackpotProb;

    setTimeout(() => {
      if (isJackpot) {
        // Target: Jackpot Symbol (last in array usually 100 val)
        const jackpotSymbol = currentSymbols[currentSymbols.length - 1];
        setReelTargets([jackpotSymbol, jackpotSymbol, jackpotSymbol]);
        
        setTimeout(() => {
          setGameState('JACKPOT');
          setTotalPoints(p => p + currentStage.jackpotReward);
          setMessage("JACKPOT!!! LEVEL CLEARED!");
          
          setTimeout(() => {
             // Next Stage
             if (stageIndex + 1 < STAGES.length) {
               setStageIndex(prev => prev + 1);
               // Note: useEffect triggers initStage
               setGameState('IDLE');
               setView('front');
             } else {
               setMessage("ALL LEVELS CLEARED! YOU ARE A GOD!");
               setGameState('VICTORY');
             }
          }, 3500);
        }, 2000); // Time for reels to stop
      } else {
        // Target: Random losing combo
        // Ensure it's not the jackpot combo
        const jackpotId = currentSymbols[currentSymbols.length - 1].id;
        
        let t1, t2, t3;
        do {
           t1 = currentSymbols[Math.floor(Math.random() * currentSymbols.length)];
           t2 = currentSymbols[Math.floor(Math.random() * currentSymbols.length)];
           t3 = currentSymbols[Math.floor(Math.random() * currentSymbols.length)];
        } while (t1.id === jackpotId && t2.id === jackpotId && t3.id === jackpotId);

        setReelTargets([t1, t2, t3]);
        
        setTimeout(() => {
          setGameState('IDLE');
          setTotalPoints(p => p + 1); // Pity point
          setMessage("MISS. +1 PT.");
        }, 2000);
      }
    }, 800); // Initial spin up time
  };

  const handleCutWire = (wireId: number) => {
    const wire = wires.find(w => w.id === wireId);
    if (!wire || wire.status === 'cut') return;

    if (wire.isBomb) {
      // GAME OVER
      setWires(prev => prev.map(w => w.id === wireId ? { ...w, status: 'cut' } : w));
      setGameState('GAME_OVER');
      setMessage("FATAL ERROR. SYSTEM FRIED.");
      setView('front'); 
    } else {
      // Boost Probability
      setWires(prev => prev.map(w => w.id === wireId ? { ...w, status: 'cut' } : w));
      setJackpotProb(prev => {
        const newProb = Math.min(0.99, prev * wire.multiplier); // Cap at 99%
        return newProb;
      });
      setMessage(`HACK SUCCESS! ODDS: ${Math.floor(jackpotProb * wire.multiplier * 100)}%`);
      // Go back to front automatically
      setTimeout(() => {
        setView('front');
      }, 1500);
    }
    setShowWireModal(null);
  };

  const toggleView = () => {
    if (gameState === 'SPINNING' || gameState === 'GAME_OVER' || gameState === 'VICTORY') return;
    setView(v => v === 'front' ? 'back' : 'front');
    setMessage(view === 'front' ? "SELECT WIRE TO CUT" : "");
  };

  const startNewGame = () => {
    setStageIndex(0);
    setTotalPoints(0);
    setHasRevived(false);
    setGameState('IDLE');
    setView('front');
    // useEffect will handle initStage
  };

  const handleRevive = () => {
    if (hasRevived) return;
    
    // Sacrifice half points
    const newScore = Math.floor(totalPoints / 2);
    setTotalPoints(newScore);
    
    setHasRevived(true);
    setGameState('IDLE');
    setView('front');
    
    // Restart CURRENT stage (new wires, new bomb location)
    // We call initStage explicitly because stageIndex doesn't change, so useEffect won't fire
    initStage(currentStage);
  };

  // --- Render Helpers ---

  const formatProb = (p: number) => {
    if (p < 0.01) return "<1%";
    return `${(p * 100).toFixed(1)}%`;
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br ${currentStage.bgGradient} transition-colors duration-1000 overflow-hidden`}>
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-40 pointer-events-none">
         <div className="bg-slate-900 p-4 border-4 border-slate-600 shadow-xl">
            <h1 className="text-sm md:text-xl text-slate-300 mb-2 uppercase tracking-widest">{currentStage.name}</h1>
            <div className="flex items-center gap-2 text-yellow-400">
               <Coins className="w-5 h-5 md:w-6 md:h-6" />
               <span className="text-xl md:text-2xl font-bold tracking-tighter">{totalPoints.toLocaleString()}</span>
            </div>
         </div>
         <div className="bg-slate-900 p-2 border-4 border-slate-600 text-xs text-slate-500">
            {hasRevived ? "REVIVE: USED" : "REVIVE: READY"}
         </div>
      </div>

      {/* Main Machine Container */}
      <div className="relative w-[340px] md:w-[500px] h-[600px] md:h-[700px] perspective-1000 group">
        
        {/* Animated Container for Flip */}
        <motion.div 
          className="relative w-full h-full transition-all duration-700 transform-style-3d"
          animate={{ rotateY: view === 'back' ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 12 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          
          {/* ================= FRONT FACE ================= */}
          <div className={`absolute inset-0 backface-hidden p-6 flex flex-col items-center shadow-2xl border-x-8 border-y-8 ${currentStage.accentColor} ${currentStage.primaryColor}`}>
             
             {/* Lever Attached to Front Face */}
             <Lever onPull={handleSpin} disabled={gameState !== 'IDLE'} />

             {/* Machine Header / Logo */}
             <div className="w-full bg-black/40 p-4 mb-4 text-center border-b-4 border-black/20">
               <h2 className="text-2xl md:text-3xl text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] tracking-widest">JACKPOT</h2>
               <div className="text-[10px] text-white/50 tracking-[0.3em] mt-1">MODEL-X50</div>
             </div>

             {/* Display Panel */}
             <div className="w-full bg-slate-800 border-4 border-black p-2 mb-4 grid grid-cols-2 gap-2 relative overflow-hidden">
               {gameState === 'GAME_OVER' && (
                 <div className="absolute inset-0 bg-red-600 z-20 flex items-center justify-center animate-pulse">
                   <span className="text-white text-xl font-bold">DEAD</span>
                 </div>
               )}
               {gameState === 'VICTORY' && (
                 <div className="absolute inset-0 bg-yellow-500 z-20 flex items-center justify-center animate-pulse">
                   <span className="text-black text-xl font-bold">WINNER</span>
                 </div>
               )}
               
               <div className="flex flex-col items-center justify-center border-r-2 border-slate-900 bg-slate-900 py-2">
                 <span className="text-[10px] text-slate-400 uppercase mb-1">PROBABILITY</span>
                 <span className={`text-xl ${jackpotProb > 0.1 ? 'text-green-400' : 'text-red-400'}`}>
                   {formatProb(jackpotProb)}
                 </span>
               </div>
               <div className="flex flex-col items-center justify-center bg-slate-900 py-2">
                  <span className="text-[10px] text-slate-400 uppercase mb-1">STATUS</span>
                  <span className="text-sm text-cyan-400 truncate w-full text-center px-1">
                    {gameState === 'IDLE' ? 'INSERT COIN' : gameState}
                  </span>
               </div>
             </div>

             {/* Message Bar */}
             <div className="h-10 mb-2 w-full flex items-center justify-center bg-black border-2 border-slate-700 px-2">
                <p className="text-xs md:text-sm text-yellow-300 animate-pulse text-center truncate">{message}</p>
             </div>

             {/* Reels */}
             <div className="flex justify-center gap-1 md:gap-2 bg-black p-3 md:p-4 border-8 border-slate-700 shadow-inner mb-6 md:mb-8">
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[0] : null} delay={0} symbols={currentSymbols} />
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[1] : null} delay={100} symbols={currentSymbols} />
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[2] : null} delay={200} symbols={currentSymbols} />
             </div>

             {/* Controls */}
             <div className="mt-auto w-full flex justify-between items-center px-2">
                <div className="text-[10px] text-white/40 max-w-[120px]">
                   PULL LEVER TO SPIN ->
                </div>

                {/* Arrow to turn machine */}
                <button 
                  onClick={toggleView}
                  disabled={gameState !== 'IDLE'}
                  className="group relative p-3 bg-slate-700 hover:bg-slate-600 border-4 border-black text-white shadow-lg active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Inspect Mechanism"
                >
                  <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
                  <div className="absolute -bottom-8 right-0 bg-black text-white text-[10px] p-1 whitespace-nowrap opacity-0 group-hover:opacity-100">
                    BACK PANEL
                  </div>
                </button>
             </div>

          </div>

          {/* ================= BACK FACE ================= */}
          <div 
            className={`absolute inset-0 backface-hidden rotate-y-180 p-6 flex flex-col items-center shadow-2xl border-8 ${currentStage.accentColor} bg-slate-800`}
            style={{ transform: 'rotateY(180deg)' }}
          >
             {/* Back Header */}
             <div className="w-full flex justify-between items-center mb-6 border-b-4 border-slate-600 pb-4">
                <h3 className="text-lg text-slate-300 flex items-center gap-2">
                   <Settings className="w-5 h-5" /> SERVICE
                </h3>
                <button onClick={toggleView} className="text-slate-400 hover:text-white p-2 border-2 border-slate-600 hover:bg-slate-700">
                   <RotateCcw className="w-5 h-5" />
                </button>
             </div>

             <div className="w-full flex-1 relative bg-black/60 shadow-inner p-4 md:p-8 flex flex-col items-center justify-start gap-4 border-4 border-slate-700">
                <p className="text-center text-xs text-red-400 mb-2 border-2 border-red-900 bg-red-950/50 p-2 w-full">
                  <AlertTriangle className="inline w-3 h-3 mr-1" />
                  DANGER: HIGH VOLTAGE
                </p>

                {/* Wires */}
                <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
                  {wires.map((wire) => (
                    <div key={wire.id} className="relative group">
                       <button
                          onClick={() => wire.status === 'intact' && setShowWireModal(wire.id)}
                          disabled={wire.status === 'cut'}
                          className={`
                            relative w-full h-10 md:h-12 border-b-4 flex items-center justify-between px-4 transition-all
                            ${wire.status === 'cut' ? 'bg-slate-900 border-slate-700 text-slate-600' : `${wire.color} border-black/30 hover:brightness-110 active:translate-y-1`}
                          `}
                       >
                          <span className={`text-xs font-bold ${wire.status === 'cut' ? '' : 'text-white drop-shadow-md'}`}>
                            {wire.status === 'cut' ? '/// SEVERED ///' : `WIRE [ ${100 + wire.id} ]`}
                          </span>
                          
                          {wire.status === 'intact' && (
                             <Scissors className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                          
                          {/* Cut Visual */}
                          {wire.status === 'cut' && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                               <Zap className="w-4 h-4 text-yellow-600" />
                            </div>
                          )}
                       </button>
                       {/* Wire Connectors */}
                       <div className="absolute -left-2 top-1/2 w-2 h-4 bg-gray-500 -translate-y-1/2" />
                       <div className="absolute -right-2 top-1/2 w-2 h-4 bg-gray-500 -translate-y-1/2" />
                    </div>
                  ))}
                </div>
                
                <div className="mt-auto text-[10px] text-slate-500 text-center w-full">
                   CUTTING A WIRE IS IRREVERSIBLE.<br/>MAY CAUSE SYSTEM RESET OR OPTIMIZATION.
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
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          >
             <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-slate-900 border-4 border-red-600 p-6 max-w-sm w-full shadow-[0_0_20px_rgba(220,38,38,0.5)]"
             >
                <div className="flex items-center gap-3 text-red-500 mb-6 border-b-2 border-red-900 pb-2">
                   <AlertTriangle className="w-8 h-8" />
                   <h3 className="text-lg font-bold">WARNING</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-8">
                   CUTTING THIS WIRE IS <span className="text-red-500 font-bold">PERMANENT</span>.
                   <br/><br/>
                   OUTCOME UNCERTAIN:
                   <br/>
                   > PROBABILITY BOOST
                   <br/>
                   > SYSTEM FATAL ERROR
                </p>
                <div className="flex gap-4">
                   <button 
                     onClick={() => setShowWireModal(null)}
                     className="flex-1 py-3 bg-slate-800 text-slate-300 text-sm border-2 border-slate-600 hover:bg-slate-700"
                   >
                     CANCEL
                   </button>
                   <button 
                     onClick={() => showWireModal !== null && handleCutWire(showWireModal)}
                     className="flex-1 py-3 bg-red-700 text-white text-sm font-bold border-2 border-red-500 hover:bg-red-600 flex justify-center items-center gap-2"
                   >
                     <Scissors className="w-4 h-4" /> CUT WIRE
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Game Over Modal --- */}
      <AnimatePresence>
        {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
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
               {gameState === 'GAME_OVER' ? (
                 <Skull className="w-20 h-20 text-red-600 mb-4 animate-bounce" />
               ) : (
                 <Trophy className="w-20 h-20 text-yellow-400 mb-4 animate-bounce" />
               )}
               
               <h2 className={`text-5xl md:text-7xl mb-4 ${gameState === 'GAME_OVER' ? 'text-red-600' : 'text-yellow-400'}`}>
                 {gameState === 'GAME_OVER' ? 'GAME OVER' : 'VICTORY'}
               </h2>
               
               <div className="mb-8 p-6 bg-slate-900 border-4 border-slate-700 w-full relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 px-2 text-slate-400 text-xs">FINAL SCORE</div>
                 <div className="text-3xl md:text-5xl text-white tracking-widest mt-2">
                   {totalPoints.toLocaleString()}
                 </div>
               </div>
               
               <div className="flex flex-col gap-4 w-full">
                  {gameState === 'GAME_OVER' && !hasRevived ? (
                    <button 
                       onClick={handleRevive}
                       className="group w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black border-b-8 border-yellow-800 active:border-b-0 active:translate-y-2 transition-all relative overflow-hidden"
                    >
                       <span className="text-lg font-bold relative z-10 flex items-center justify-center gap-2">
                          <RotateCcw className="w-5 h-5" /> RE-DO STAGE {currentStage.id}
                       </span>
                       <span className="block text-xs mt-1 relative z-10 opacity-75">
                         COST: {Math.ceil(totalPoints / 2)} PTS (50%)
                       </span>
                       <div className="absolute inset-0 bg-yellow-400 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 opacity-50"></div>
                    </button>
                  ) : gameState === 'GAME_OVER' && hasRevived ? (
                    <div className="w-full py-4 bg-slate-900 text-slate-600 border-2 border-slate-800 text-sm">
                      NO MORE REVIVES AVAILABLE
                    </div>
                  ) : null}

                  <button 
                     onClick={startNewGame}
                     className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-600 hover:border-white transition-colors text-sm"
                  >
                     RESTART FROM LEVEL 01 (0 PTS)
                  </button>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
