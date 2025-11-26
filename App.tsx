import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, AlertTriangle, Zap, Coins, Scissors, RotateCcw, Skull, Trophy, Battery, Activity, Wrench } from 'lucide-react';
import { Reel } from './components/Reel';
import { Lever } from './components/Lever';
import { SettingsPanel } from './components/SettingsPanel';
import { STAGES, SYMBOL_SETS, WIRE_COLORS, SPEED_CONFIG } from './constants';
import { StageConfig, Wire, SlotSymbol, GameSettings } from './types';
import { soundEngine } from './audio';

export default function App() {
  const [stageIndex, setStageIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'JACKPOT' | 'GAME_OVER' | 'VICTORY'>('IDLE');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [hasRevived, setHasRevived] = useState(false);
  const currentStage = STAGES[stageIndex] || STAGES[0];
  const currentSymbols = useMemo(() => SYMBOL_SETS[currentStage.symbolSetId] || SYMBOL_SETS['PIZZERIA'], [currentStage]);
  
  // Game Settings State
  const [settings, setSettings] = useState<GameSettings>({ volume: 0.5, speed: 'NORMAL' });
  const [showSettings, setShowSettings] = useState(false);

  const [jackpotProb, setJackpotProb] = useState(currentStage.baseProb);
  const [wires, setWires] = useState<Wire[]>([]);
  const [reelTargets, setReelTargets] = useState<[SlotSymbol, SlotSymbol, SlotSymbol] | null>(null);
  const [showWireModal, setShowWireModal] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");

  // Update sound engine when settings change
  useEffect(() => {
    soundEngine.setVolume(settings.volume);
  }, [settings.volume]);

  // Start ambience on mount (user interaction required for actual play usually)
  useEffect(() => {
    const handleInteract = () => {
        soundEngine.playAmbience();
        window.removeEventListener('click', handleInteract);
    };
    window.addEventListener('click', handleInteract);
    return () => {
        soundEngine.stopAmbience();
        window.removeEventListener('click', handleInteract);
    };
  }, []);

  const initStage = useCallback((stage: StageConfig) => {
    setJackpotProb(stage.baseProb);
    setMessage(`SYSTEM READY: ${stage.name}`);
    
    const newWires: Wire[] = Array.from({ length: stage.wireCount }).map((_, i) => ({
      id: i,
      color: WIRE_COLORS[i % WIRE_COLORS.length],
      status: 'intact',
      isBomb: false,
      multiplier: 1.5 + Math.random(),
    }));

    const bombIndex = Math.floor(Math.random() * newWires.length);
    newWires[bombIndex].isBomb = true;
    
    setWires(newWires);
    setReelTargets(null);
  }, []);

  useEffect(() => {
    initStage(currentStage);
  }, [stageIndex, initStage]);

  const handleSpin = () => {
    if (gameState !== 'IDLE') return;

    setGameState('SPINNING');
    setMessage("INITIATING SEQUENCE...");
    soundEngine.playSpin();

    const isJackpot = Math.random() < jackpotProb;
    const speedConfig = SPEED_CONFIG[settings.speed];

    setTimeout(() => {
      if (isJackpot) {
        const jackpotSymbol = currentSymbols[currentSymbols.length - 1];
        setReelTargets([jackpotSymbol, jackpotSymbol, jackpotSymbol]);
        
        setTimeout(() => {
          setGameState('JACKPOT');
          setTotalPoints(p => p + currentStage.jackpotReward);
          setMessage("CRITICAL SUCCESS. ADVANCING.");
          soundEngine.playJackpot();
          
          setTimeout(() => {
             if (stageIndex + 1 < STAGES.length) {
               setStageIndex(prev => prev + 1);
               setGameState('IDLE');
               setView('front');
             } else {
               setMessage("SHIFT COMPLETE. YOU SURVIVED.");
               setGameState('VICTORY');
               soundEngine.playJackpot();
             }
          }, 3500);
        }, speedConfig.reelDelay * 3); // Wait for reels to settle visually
      } else {
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
          setTotalPoints(p => p + 1);
          setMessage("FAILURE. POWER COMPENSATED +1.");
          soundEngine.playLose(); // Small lose sound
        }, speedConfig.reelDelay * 3);
      }
    }, speedConfig.totalDuration);
  };

  const handleCutWire = (wireId: number) => {
    const wire = wires.find(w => w.id === wireId);
    if (!wire || wire.status === 'cut') return;
    
    soundEngine.playClick();

    if (wire.isBomb) {
      soundEngine.playJumpscare();
      setWires(prev => prev.map(w => w.id === wireId ? { ...w, status: 'cut' } : w));
      setGameState('GAME_OVER');
      setMessage("JUMPSCARE_LOADED.EXE");
      setView('front'); 
    } else {
      soundEngine.playWarning(); // Or a success chime? Warning fits the "risk" theme
      setWires(prev => prev.map(w => w.id === wireId ? { ...w, status: 'cut' } : w));
      setJackpotProb(prev => Math.min(0.99, prev * wire.multiplier));
      setMessage(`BYPASS SUCCESS. ODDS: ${Math.floor(jackpotProb * wire.multiplier * 100)}%`);
      setTimeout(() => setView('front'), 1500);
    }
    setShowWireModal(null);
  };

  const toggleView = () => {
    if (gameState === 'SPINNING' || gameState === 'GAME_OVER' || gameState === 'VICTORY') return;
    soundEngine.playClick();
    setView(v => v === 'front' ? 'back' : 'front');
    setMessage(view === 'front' ? "MAINTENANCE MODE ACTIVE" : "SYSTEM READY");
  };

  const startNewGame = () => {
    soundEngine.playClick();
    setStageIndex(0);
    setTotalPoints(0);
    setHasRevived(false);
    setGameState('IDLE');
    setView('front');
  };

  const handleRevive = () => {
    if (hasRevived) return;
    soundEngine.playClick();
    const newScore = Math.floor(totalPoints / 2);
    setTotalPoints(newScore);
    setHasRevived(true);
    setGameState('IDLE');
    setView('front');
    initStage(currentStage);
  };

  const formatProb = (p: number) => {
    if (p < 0.01) return "<1%";
    return `${(p * 100).toFixed(1)}%`;
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 crt-flicker transition-colors duration-1000 overflow-hidden relative checkerboard`}>
      
      {/* Dark Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,black_90%)] pointer-events-none z-10" />

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-40 pointer-events-none text-green-500 font-mono">
         <div className="bg-black/80 p-4 border-2 border-green-900/50 shadow-[0_0_15px_rgba(0,255,0,0.1)]">
            <h1 className="text-xl md:text-2xl mb-2 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]"></span>
              {currentStage.name}
            </h1>
            <div className="flex items-center gap-2 text-white">
               <Coins className="w-5 h-5 text-yellow-500" />
               <span className="text-2xl retro-font text-yellow-500">{totalPoints.toLocaleString()}</span>
            </div>
         </div>
         <div className="bg-black/80 p-2 border-2 border-green-900/50 flex flex-col items-end pointer-events-auto">
            <button 
                onClick={() => { soundEngine.playClick(); setShowSettings(true); }}
                className="mb-2 p-2 hover:bg-green-900/30 text-green-500 border border-transparent hover:border-green-700 transition-colors"
                title="Settings"
            >
                <Settings className="w-6 h-6 animate-spin-slow" />
            </button>
            <div className="flex items-center gap-2 text-xs mb-1 pointer-events-none">
              <Battery className={`w-4 h-4 ${hasRevived ? 'text-red-500' : 'text-green-500'}`} />
              <span>POWER: {hasRevived ? "CRITICAL" : "STABLE"}</span>
            </div>
            <div className="text-[10px] text-zinc-500 pointer-events-none">
               CAM-2B
            </div>
         </div>
      </div>

      {/* Main Machine Container */}
      <div className="relative w-[340px] md:w-[500px] h-[600px] md:h-[700px] perspective-1000 group z-20">
        
        <motion.div 
          className="relative w-full h-full transition-all duration-700 transform-style-3d"
          animate={{ rotateY: view === 'back' ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 12 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          
          {/* ================= FRONT FACE ================= */}
          <div className="absolute inset-0 backface-hidden p-6 flex flex-col items-center shadow-2xl bg-zinc-900 border-x-8 border-y-8 border-black">
             {/* Dirt Overlay */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')] opacity-30 pointer-events-none" />

             <Lever 
                onPull={handleSpin} 
                disabled={gameState !== 'IDLE'} 
                speed={settings.speed}
             />

             {/* Machine Header */}
             <div className="w-full bg-black border-4 border-zinc-800 p-4 mb-4 text-center shadow-inner relative overflow-hidden">
               <h2 className="text-3xl retro-font text-red-600 animate-pulse drop-shadow-[0_0_5px_red]">FAZ-SLOTS</h2>
               <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
             </div>

             {/* Display Panel - Green Terminal Look */}
             <div className="w-full bg-black border-4 border-zinc-700 p-2 mb-4 grid grid-cols-2 gap-2 relative overflow-hidden font-mono">
               <div className="absolute inset-0 bg-green-500/5 pointer-events-none"></div>
               
               <div className="flex flex-col items-center justify-center border-r border-zinc-800">
                 <span className="text-[10px] text-green-700 uppercase mb-1">WIN PROBABILITY</span>
                 <span className={`text-xl ${jackpotProb > 0.1 ? 'text-green-400' : 'text-red-600'} text-glow`}>
                   {formatProb(jackpotProb)}
                 </span>
               </div>
               <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-green-700 uppercase mb-1">STATUS</span>
                  <span className="text-sm text-green-400 truncate w-full text-center px-1 animate-pulse">
                    {gameState}
                  </span>
               </div>
             </div>

             {/* Message Bar */}
             <div className="h-12 mb-4 w-full flex items-center justify-center bg-black border-2 border-zinc-800 px-2 font-mono">
                <p className="text-sm text-green-500 animate-pulse text-center truncate uppercase">
                  {">"} {message} <span className="animate-blink">_</span>
                </p>
             </div>

             {/* Reels */}
             <div className="flex justify-center gap-1 md:gap-2 bg-zinc-950 p-4 border-8 border-black shadow-[inset_0_0_20px_black] mb-6">
               <Reel 
                 spinning={gameState === 'SPINNING'} 
                 targetSymbol={reelTargets ? reelTargets[0] : null} 
                 delay={0} 
                 symbols={currentSymbols} 
                 speed={settings.speed}
               />
               <Reel 
                 spinning={gameState === 'SPINNING'} 
                 targetSymbol={reelTargets ? reelTargets[1] : null} 
                 delay={SPEED_CONFIG[settings.speed].reelDelay} 
                 symbols={currentSymbols} 
                 speed={settings.speed}
               />
               <Reel 
                 spinning={gameState === 'SPINNING'} 
                 targetSymbol={reelTargets ? reelTargets[2] : null} 
                 delay={SPEED_CONFIG[settings.speed].reelDelay * 2} 
                 symbols={currentSymbols} 
                 speed={settings.speed}
               />
             </div>

             {/* Maintenance Button (Distinct from Settings) */}
             <div className="mt-auto w-full flex justify-between items-center px-2">
                <div className="text-[10px] text-zinc-600 max-w-[120px] font-mono">
                   PULL LEVER TO START SHIFT
                </div>

                <button 
                  onClick={toggleView}
                  disabled={gameState !== 'IDLE'}
                  className="group relative p-3 bg-zinc-800 hover:bg-zinc-700 border-2 border-black text-white shadow-lg active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Maintenance Panel"
                >
                  <span className="text-[10px] font-mono hidden md:inline">REAR ACCESS</span>
                  <Wrench className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300 text-zinc-400" />
                </button>
             </div>
          </div>

          {/* ================= BACK FACE ================= */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 p-6 flex flex-col items-center shadow-2xl bg-zinc-900 border-8 border-black"
            style={{ transform: 'rotateY(180deg)' }}
          >
             <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.5)_10px,rgba(0,0,0,0.5)_20px)] pointer-events-none" />
             
             {/* Back Header */}
             <div className="w-full flex justify-between items-center mb-6 border-b-2 border-zinc-700 pb-4 z-10">
                <h3 className="text-lg text-yellow-600 flex items-center gap-2 font-mono">
                   <Activity className="w-5 h-5" /> MAINTENANCE
                </h3>
                <button onClick={toggleView} className="text-zinc-400 hover:text-white p-2 border border-zinc-700 bg-black">
                   <RotateCcw className="w-4 h-4" />
                </button>
             </div>

             <div className="w-full flex-1 relative bg-black/80 shadow-inner p-4 md:p-8 flex flex-col items-center justify-start gap-4 border-4 border-zinc-800 z-10">
                <p className="text-center text-xs text-red-500 mb-2 font-mono border border-red-900 bg-red-950/20 p-2 w-full animate-pulse">
                  <AlertTriangle className="inline w-3 h-3 mr-1" />
                  WARNING: TAMPERING VOIDS WARRANTY
                </p>

                {/* Wires */}
                <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
                  {wires.map((wire) => (
                    <div key={wire.id} className="relative group">
                       <button
                          onClick={() => {
                            if (wire.status === 'intact') {
                              soundEngine.playClick();
                              setShowWireModal(wire.id);
                            }
                          }}
                          disabled={wire.status === 'cut'}
                          className={`
                            relative w-full h-10 border-b-2 flex items-center justify-between px-4 transition-all
                            ${wire.status === 'cut' ? 'bg-black border-zinc-800 text-zinc-700' : `${wire.color} border-black shadow-md hover:brightness-75 active:translate-y-1`}
                          `}
                       >
                          <span className={`text-xs font-bold font-mono ${wire.status === 'cut' ? 'line-through' : 'text-white'}`}>
                            {wire.status === 'cut' ? 'DISCONNECTED' : `CIRCUIT_${100 + wire.id}`}
                          </span>
                          
                          {wire.status === 'intact' && (
                             <Scissors className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                          
                          {wire.status === 'cut' && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                               <Zap className="w-4 h-4 text-yellow-900" />
                            </div>
                          )}
                       </button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      {/* --- Confirmation Modal (Dark & Scary) --- */}
      <AnimatePresence>
        {showWireModal !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
          >
             <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border-2 border-red-700 p-6 max-w-sm w-full shadow-[0_0_50px_rgba(255,0,0,0.2)] relative overflow-hidden"
             >
                <div className="absolute inset-0 scanlines opacity-50 pointer-events-none"></div>
                <div className="flex items-center gap-3 text-red-600 mb-6 border-b border-red-900 pb-2 relative z-10">
                   <AlertTriangle className="w-8 h-8 animate-pulse" />
                   <h3 className="text-xl font-bold retro-font">DANGER</h3>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-8 font-mono relative z-10">
                   SEVERING CONNECTION...
                   <br/><br/>
                   THIS ACTION CANNOT BE UNDONE.
                   <br/>
                   POTENTIAL FOR: <span className="text-green-500">SYSTEM OPTIMIZATION</span> OR <span className="text-red-600">CATASTROPHIC FAILURE</span>.
                </p>
                <div className="flex gap-4 relative z-10">
                   <button 
                     onClick={() => { soundEngine.playClick(); setShowWireModal(null); }}
                     className="flex-1 py-3 bg-black text-zinc-400 text-sm border border-zinc-700 hover:bg-zinc-800 font-mono"
                   >
                     ABORT
                   </button>
                   <button 
                     onClick={() => showWireModal !== null && handleCutWire(showWireModal)}
                     className="flex-1 py-3 bg-red-900/50 text-red-500 text-sm font-bold border border-red-600 hover:bg-red-900 flex justify-center items-center gap-2 font-mono"
                   >
                     <Scissors className="w-4 h-4" /> CUT
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Settings Modal --- */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel 
             settings={settings}
             onUpdate={(newSettings) => {
               soundEngine.playClick();
               setSettings(newSettings);
             }}
             onClose={() => { soundEngine.playClick(); setShowSettings(false); }}
          />
        )}
      </AnimatePresence>

      {/* --- Game Over / Victory Modal (Static Noise) --- */}
      <AnimatePresence>
        {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4 overflow-hidden"
          >
             {/* Static Background */}
             <div className="absolute inset-0 opacity-20 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-cover pointer-events-none mix-blend-screen" />

             <motion.div
               initial={{ scale: 0.8 }}
               animate={{ scale: 1 }}
               className="flex flex-col items-center text-center max-w-lg w-full relative z-10"
             >
               {gameState === 'GAME_OVER' ? (
                 <Skull className="w-24 h-24 text-red-700 mb-4 animate-bounce drop-shadow-[0_0_15px_red]" />
               ) : (
                 <Trophy className="w-24 h-24 text-yellow-500 mb-4 animate-bounce drop-shadow-[0_0_15px_yellow]" />
               )}
               
               <h2 className={`text-5xl md:text-7xl mb-4 retro-font ${gameState === 'GAME_OVER' ? 'text-red-600' : 'text-yellow-500'} text-glow`}>
                 {gameState === 'GAME_OVER' ? 'GAME OVER' : '6:00 AM'}
               </h2>
               
               <div className="mb-8 p-6 bg-black border-2 border-zinc-800 w-full relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 px-2 text-zinc-500 text-xs font-mono">FINAL PAYCHECK</div>
                 <div className="text-3xl md:text-5xl text-white tracking-widest mt-2 retro-font">
                   ${totalPoints.toLocaleString()}
                 </div>
               </div>
               
               <div className="flex flex-col gap-4 w-full font-mono">
                  {gameState === 'GAME_OVER' && !hasRevived ? (
                    <button 
                       onClick={handleRevive}
                       className="group w-full py-4 bg-yellow-900/50 hover:bg-yellow-800/50 text-yellow-500 border border-yellow-700 transition-all relative overflow-hidden"
                    >
                       <span className="text-lg font-bold relative z-10 flex items-center justify-center gap-2">
                          <RotateCcw className="w-5 h-5" /> RESTART NIGHT {currentStage.id}
                       </span>
                       <span className="block text-xs mt-1 relative z-10 opacity-75">
                         PENALTY: -{Math.ceil(totalPoints / 2)} TOKENS
                       </span>
                    </button>
                  ) : gameState === 'GAME_OVER' && hasRevived ? (
                    <div className="w-full py-4 bg-black text-red-900 border border-red-900 text-sm">
                      SYSTEM LOCKED // NO REVIVES LEFT
                    </div>
                  ) : null}

                  <button 
                     onClick={startNewGame}
                     className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 transition-colors text-sm"
                  >
                     NEW GAME (NIGHT 1)
                  </button>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}