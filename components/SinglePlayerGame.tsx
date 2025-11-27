
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, AlertTriangle, Zap, Coins, Scissors, RotateCcw, Skull, Trophy, Battery, Activity, Wrench, ArrowLeft, Save, Trash2, Play } from 'lucide-react';
import { Reel } from './Reel';
import { Lever } from './Lever';
import { SettingsPanel } from './SettingsPanel';
import { STAGES, SYMBOL_SETS, WIRE_COLORS, SPEED_CONFIG, STORY_LOGS, GAME_RESULT_THEMES } from '../constants';
import { StageConfig, Wire, SlotSymbol, GameSettings, SinglePlayerSaveState } from '../types';
import { soundEngine } from '../audio';
import { useGame } from '../contexts/GameContext';

interface SinglePlayerGameProps {
    onBack: () => void;
}

const STORAGE_KEY = 'faz_single_save';

export const SinglePlayerGame: React.FC<SinglePlayerGameProps> = ({ onBack }) => {
  const { service } = useGame();
  
  // Game State
  const [stageIndex, setStageIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [jackpotProb, setJackpotProb] = useState(0.15);
  const [wires, setWires] = useState<Wire[]>([]);
  const [hasRevived, setHasRevived] = useState(false);
  
  // UI State
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'JACKPOT' | 'GAME_OVER' | 'VICTORY'>('IDLE');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [showStory, setShowStory] = useState(false);
  const [showCoinsBurst, setShowCoinsBurst] = useState(false);
  const [reelTargets, setReelTargets] = useState<[SlotSymbol, SlotSymbol, SlotSymbol] | null>(null);
  const [showWireModal, setShowWireModal] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [showResumeModal, setShowResumeModal] = useState(false);
  
  // New State for Result Theme
  const [resultTheme, setResultTheme] = useState(GAME_RESULT_THEMES[0]);

  // Telemetry ref
  const lastReadyTime = useRef<number>(Date.now());

  // Settings
  const [settings, setSettings] = useState<GameSettings>({ volume: 0.5, speed: 'NORMAL', storyMode: false });
  const [showSettings, setShowSettings] = useState(false);

  const currentStage = STAGES[stageIndex] || STAGES[0];
  const currentSymbols = useMemo(() => SYMBOL_SETS[currentStage.symbolSetId] || SYMBOL_SETS['CLASSIC'], [currentStage]);

  // Initial Load Check
  useEffect(() => {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
          try {
              const parsed: SinglePlayerSaveState = JSON.parse(savedData);
              // Basic validation
              if (parsed && typeof parsed.stageIndex === 'number') {
                  setShowResumeModal(true);
                  return; // Don't init new stage yet
              }
          } catch (e) {
              console.error("Save file corrupted", e);
              localStorage.removeItem(STORAGE_KEY);
          }
      }
      // If no save, init fresh
      initStage(STAGES[0]);
  }, []);

  // Set Ready Time when IDLE
  useEffect(() => {
      if (gameState === 'IDLE') {
          lastReadyTime.current = Date.now();
      }
  }, [gameState]);

  // Auto-Save Effect
  useEffect(() => {
      if (gameState === 'IDLE' && wires.length > 0 && !showResumeModal) {
          const saveState: SinglePlayerSaveState = {
              stageIndex,
              totalPoints,
              wires,
              hasRevived,
              jackpotProb
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
      }
  }, [gameState, stageIndex, totalPoints, wires, hasRevived, jackpotProb, showResumeModal]);


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
    lastReadyTime.current = Date.now();
  }, []);

  // Update sound engine when settings change
  useEffect(() => {
    soundEngine.setVolume(settings.volume);
  }, [settings.volume]);

  const handleResume = () => {
      soundEngine.playClick();
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
          const parsed: SinglePlayerSaveState = JSON.parse(savedData);
          setStageIndex(parsed.stageIndex);
          setTotalPoints(parsed.totalPoints);
          setWires(parsed.wires);
          setHasRevived(parsed.hasRevived);
          setJackpotProb(parsed.jackpotProb);
          
          setMessage(`RESUMING SESSION ${parsed.stageIndex + 1}`);
          setShowResumeModal(false);
          setGameState('IDLE');
      } else {
          startNewGame();
      }
  };

  const handleGameOver = useCallback((points: number) => {
      // Pick a random theme for the result screen
      const randomTheme = GAME_RESULT_THEMES[Math.floor(Math.random() * GAME_RESULT_THEMES.length)];
      setResultTheme(randomTheme);

      // Clear save on game over
      localStorage.removeItem(STORAGE_KEY);
      // Submit Score with Stage Index (Stages Cleared)
      service.submitScore(points, stageIndex);
  }, [service, stageIndex]);

  const advanceStage = useCallback(() => {
    if (stageIndex + 1 < STAGES.length) {
       setStageIndex(prev => prev + 1);
       // We need to re-init wires for next stage
       initStage(STAGES[stageIndex + 1]); 
       
       setGameState('IDLE');
       setView('front');
       setShowStory(false);
       setShowCoinsBurst(false);
    } else {
       setMessage("QUOTA MET. YOU SURVIVED.");
       setGameState('VICTORY');
       soundEngine.playJackpot();
       handleGameOver(totalPoints);
    }
  }, [stageIndex, totalPoints, handleGameOver, initStage]);

  const handleSpin = () => {
    if (gameState !== 'IDLE') return;

    setGameState('SPINNING');
    setMessage("INITIATING SEQUENCE...");
    soundEngine.playSpin();

    const reactionTime = Date.now() - lastReadyTime.current;
    const isJackpot = Math.random() < jackpotProb;
    const speedConfig = SPEED_CONFIG[settings.speed];

    // Record Telemetry
    service.sendTelemetry('SPIN', {
        roundPhase: currentStage.name,
        reactionTimeMs: reactionTime,
        outcome: isJackpot ? 'HIT' : 'SAFE'
    });

    setTimeout(() => {
      if (isJackpot) {
        const jackpotSymbol = currentSymbols[currentSymbols.length - 1];
        setReelTargets([jackpotSymbol, jackpotSymbol, jackpotSymbol]);
        
        setTimeout(() => {
          setGameState('JACKPOT');
          setTotalPoints(p => p + currentStage.jackpotReward);
          setMessage("CRITICAL SUCCESS. ADVANCING.");
          soundEngine.playJackpot();
          
          if (settings.storyMode) {
             setShowCoinsBurst(true);
             setTimeout(() => {
                 setShowCoinsBurst(false);
                 setShowStory(true);
             }, 1200);
          } else {
             setTimeout(() => {
               advanceStage();
             }, 3500);
          }
        }, speedConfig.reelDelay * 3); 
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
          soundEngine.playLose(); 
        }, speedConfig.reelDelay * 3);
      }
    }, speedConfig.totalDuration);
  };

  const handleCutWire = (wireId: number) => {
    const wire = wires.find(w => w.id === wireId);
    if (!wire || wire.status === 'cut') return;
    
    soundEngine.playClick();
    const reactionTime = Date.now() - lastReadyTime.current;

    // Record Telemetry
    service.sendTelemetry('CUT_WIRE', {
        roundPhase: currentStage.name,
        targetId: wireId.toString(),
        reactionTimeMs: reactionTime,
        outcome: wire.isBomb ? 'ELIMINATED' : 'ODDS_CHANGE'
    });

    if (wire.isBomb) {
      soundEngine.playJumpscare();
      setWires(prev => prev.map(w => w.id === wireId ? { ...w, status: 'cut' } : w));
      setGameState('GAME_OVER');
      handleGameOver(totalPoints);
      setMessage("SHORT_CIRCUIT_DETECTED");
      setView('front'); 
    } else {
      soundEngine.playWarning(); 
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
    localStorage.removeItem(STORAGE_KEY);
    setShowResumeModal(false);
    
    setStageIndex(0);
    setTotalPoints(0);
    setHasRevived(false);
    setGameState('IDLE');
    setView('front');
    setShowStory(false);
    setShowCoinsBurst(false);
    initStage(STAGES[0]);
  };

  const handleRevive = () => {
    if (hasRevived) return;
    soundEngine.playClick();
    const newScore = Math.floor(totalPoints / 2);
    setTotalPoints(newScore);
    setHasRevived(true);
    setGameState('IDLE');
    setView('front');
    setShowStory(false);
    setShowCoinsBurst(false);
    initStage(currentStage);
  };

  const handleStoryClick = () => {
     if (showStory) {
         soundEngine.playClick();
         setShowStory(false);
         advanceStage();
     }
  };
  
  const handleExit = () => {
      soundEngine.playClick();
      // If exiting mid-game (not game over), the useEffect already saved state.
      // Just go back.
      onBack();
  }

  const formatProb = (p: number) => {
    if (p < 0.01) return "<1%";
    return `${(p * 100).toFixed(1)}%`;
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 crt-flicker transition-colors duration-1000 overflow-hidden relative checkerboard`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,black_90%)] pointer-events-none z-10" />

      {/* --- RESUME MODAL --- */}
      <AnimatePresence>
        {showResumeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-zinc-900 border-2 border-green-700 p-6 max-w-sm w-full shadow-[0_0_50px_rgba(0,255,0,0.1)] text-center relative overflow-hidden">
                <div className="absolute inset-0 scanlines opacity-50 pointer-events-none"></div>
                <div className="relative z-10">
                    <Save className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl retro-font text-green-500 mb-2">SAVE DATA FOUND</h2>
                    <p className="text-zinc-400 text-xs font-mono mb-6">UNFINISHED SESSION DETECTED IN MEMORY BANK.</p>
                    
                    <div className="flex flex-col gap-3">
                        <button onClick={handleResume} className="w-full py-3 bg-green-900/30 border border-green-600 text-green-400 hover:bg-green-900/50 hover:text-white flex items-center justify-center gap-2 transition-all">
                           <Play className="w-4 h-4" /> RESUME SESSION
                        </button>
                        <button onClick={startNewGame} className="w-full py-3 bg-zinc-900 border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-500 flex items-center justify-center gap-2 transition-all">
                           <Trash2 className="w-4 h-4" /> DISCARD & START NEW
                        </button>
                    </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showStory && <div className="fixed inset-0 z-[100] cursor-pointer" onClick={handleStoryClick}></div>}

      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-40 pointer-events-none text-green-500 font-mono">
         <div className="bg-black/80 p-2 md:p-4 border-2 border-green-900/50 shadow-[0_0_15px_rgba(0,255,0,0.1)] pointer-events-auto max-w-[50%]">
             <button onClick={handleExit} className="text-[10px] md:text-xs text-zinc-500 hover:text-white flex items-center gap-1 mb-1 md:mb-2">
                 <ArrowLeft className="w-3 h-3"/> EXIT
             </button>
            <h1 className="text-base md:text-2xl mb-1 md:mb-2 flex items-center gap-2 truncate">
              <span className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red] flex-shrink-0"></span>
              {currentStage.name}
            </h1>
            <div className="flex items-center gap-2 text-white">
               <Coins className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
               <span className="text-lg md:text-2xl retro-font text-yellow-500">{totalPoints.toLocaleString()}</span>
            </div>
         </div>
         <div className="bg-black/80 p-2 border-2 border-green-900/50 flex flex-col items-end pointer-events-auto">
            <button 
                onClick={() => { soundEngine.playClick(); setShowSettings(true); }}
                className="mb-1 md:mb-2 p-1 md:p-2 hover:bg-green-900/30 text-green-500 border border-transparent hover:border-green-700 transition-colors"
            >
                <Settings className="w-5 h-5 md:w-6 md:h-6 animate-spin-slow" />
            </button>
            <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs mb-1 pointer-events-none">
              <Battery className={`w-3 h-3 md:w-4 md:h-4 ${hasRevived ? 'text-red-500' : 'text-green-500'}`} />
              <span className="hidden md:inline">POWER:</span>
              <span>{hasRevived ? "CRIT" : "OK"}</span>
            </div>
         </div>
      </div>

      <div className="relative w-[290px] xs:w-[340px] md:w-[500px] h-[500px] xs:h-[600px] md:h-[700px] perspective-1000 group z-20 mt-8 md:mt-0">
        <motion.div 
          className="relative w-full h-full transition-all duration-700 transform-style-3d"
          animate={{ rotateY: view === 'back' ? 180 : 0 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* FRONT */}
          <div className="absolute inset-0 backface-hidden p-3 md:p-4 flex flex-col items-center shadow-2xl bg-zinc-900 border-x-8 border-y-8 border-black">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')] opacity-30 pointer-events-none" />
             <Lever onPull={handleSpin} disabled={gameState !== 'IDLE' || showResumeModal} speed={settings.speed} />

             <div className="w-full bg-black border-4 border-zinc-800 p-2 md:p-4 mb-2 text-center shadow-inner relative overflow-hidden">
               <h2 className="text-xl md:text-3xl retro-font text-red-600 animate-pulse drop-shadow-[0_0_5px_red]">VOLTAGE VICES</h2>
             </div>

             <div className="w-full bg-black border-4 border-zinc-700 p-1 md:p-2 mb-2 grid grid-cols-2 gap-2 relative overflow-hidden font-mono">
               <div className="absolute inset-0 bg-green-500/5 pointer-events-none"></div>
               <div className="flex flex-col items-center justify-center border-r border-zinc-800">
                 <span className="text-[8px] md:text-[10px] text-green-700 uppercase mb-1">WIN PROBABILITY</span>
                 <span className={`text-lg md:text-xl ${jackpotProb > 0.1 ? 'text-green-400' : 'text-red-600'} text-glow`}>
                   {formatProb(jackpotProb)}
                 </span>
               </div>
               <div className="flex flex-col items-center justify-center">
                  <span className="text-[8px] md:text-[10px] text-green-700 uppercase mb-1">STATUS</span>
                  <span className="text-xs md:text-sm text-green-400 truncate w-full text-center px-1 animate-pulse">{gameState}</span>
               </div>
             </div>

             <div className="h-8 md:h-10 mb-2 w-full flex items-center justify-center bg-black border-2 border-zinc-800 px-2 font-mono">
                <p className="text-xs md:text-sm text-green-500 animate-pulse text-center truncate uppercase">
                  {">"} {message} <span className="animate-blink">_</span>
                </p>
             </div>

             <div className="flex justify-center gap-1 md:gap-2 bg-zinc-950 p-3 md:p-4 border-8 border-black shadow-[inset_0_0_20px_black] mb-2">
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[0] : null} delay={0} symbols={currentSymbols} speed={settings.speed} />
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[1] : null} delay={SPEED_CONFIG[settings.speed].reelDelay} symbols={currentSymbols} speed={settings.speed} />
               <Reel spinning={gameState === 'SPINNING'} targetSymbol={reelTargets ? reelTargets[2] : null} delay={SPEED_CONFIG[settings.speed].reelDelay * 2} symbols={currentSymbols} speed={settings.speed} />
             </div>

             <div className="w-full flex justify-between items-center px-2 mb-2">
                <div className="text-[8px] md:text-[10px] text-zinc-600 max-w-[120px] font-mono">PULL LEVER TO TEST YOUR LUCK</div>
                <button 
                  onClick={toggleView}
                  disabled={gameState !== 'IDLE' || showResumeModal}
                  className="group relative p-2 md:p-3 bg-zinc-800 hover:bg-zinc-700 border-2 border-black text-white shadow-lg active:translate-y-1 disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="text-[10px] font-mono hidden md:inline">REAR ACCESS</span>
                  <Wrench className="w-4 h-4 group-hover:-rotate-12 transition-transform duration-300 text-zinc-400" />
                </button>
             </div>

             <div className="w-full mt-auto h-16 md:h-20 bg-zinc-950 border-t-4 border-black relative flex justify-center items-end shadow-inner">
                <div className="w-3/4 h-10 md:h-12 bg-zinc-800 border-x-4 border-t-4 border-black rounded-t-lg relative flex justify-center items-center overflow-visible shadow-lg">
                    <div className="w-3/4 h-2 md:h-3 bg-black rounded-full shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)] translate-y-2 border-b border-zinc-700 relative z-10"></div>
                    <AnimatePresence>
                      {gameState === 'JACKPOT' && settings.storyMode && showStory && (
                          <motion.div
                            key="story-note"
                            initial={{ y: 50, rotate: -5, opacity: 0 }}
                            animate={{ y: -40, rotate: 2, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 md:w-56 bg-[#f3e5ab] text-black p-3 text-[10px] md:text-xs font-mono shadow-2xl z-[110] leading-tight cursor-pointer"
                            onClick={handleStoryClick}
                            style={{ clipPath: "polygon(2% 0, 95% 5%, 100% 95%, 5% 100%, 0 10%)", backgroundImage: "repeating-linear-gradient(transparent, transparent 18px, #ccc 19px)" }}
                          >
                            <p className="relative z-10 font-bold opacity-80 uppercase text-zinc-800">{STORY_LOGS[stageIndex % STORY_LOGS.length] || "DATA CORRUPTED"}</p>
                            <div className="mt-2 text-[8px] text-zinc-500 font-bold text-right animate-pulse">CLICK TO CONTINUE...</div>
                          </motion.div>
                      )}
                      {gameState === 'JACKPOT' && (!settings.storyMode || showCoinsBurst) && (
                          <motion.div key="coins-container" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 flex items-end justify-center overflow-visible z-0">
                             {Array.from({ length: 25 }).map((_, i) => (
                                <motion.div key={i} initial={{ y: 0, x: 0, scale: 0.5, opacity: 0 }} animate={{ y: [0, -100 - Math.random() * 80, 50], x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 250], opacity: [1, 1, 0] }} transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5 }} className="absolute w-6 h-6 md:w-8 md:h-8 bg-yellow-500 rounded-full border-4 border-yellow-700 shadow-xl flex items-center justify-center">
                                  <div className="w-3 h-3 md:w-5 md:h-5 border border-yellow-300 rounded-full opacity-50" />
                                </motion.div>
                             ))}
                          </motion.div>
                      )}
                    </AnimatePresence>
                </div>
             </div>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 p-4 md:p-6 flex flex-col items-center shadow-2xl bg-zinc-900 border-8 border-black" style={{ transform: 'rotateY(180deg)' }}>
             <div className="w-full flex justify-between items-center mb-4 md:mb-6 border-b-2 border-zinc-700 pb-2 md:pb-4 z-10">
                <h3 className="text-sm md:text-lg text-yellow-600 flex items-center gap-2 font-mono"><Activity className="w-4 h-4 md:w-5 md:h-5" /> MAINTENANCE</h3>
                <button onClick={toggleView} className="text-zinc-400 hover:text-white p-2 border border-zinc-700 bg-black"><RotateCcw className="w-3 h-3 md:w-4 md:h-4" /></button>
             </div>
             <div className="w-full flex-1 relative bg-black/80 shadow-inner p-2 md:p-8 flex flex-col items-center justify-start gap-2 md:gap-4 border-4 border-zinc-800 z-10 overflow-y-auto">
                <p className="text-center text-[10px] md:text-xs text-red-500 mb-2 font-mono border border-red-900 bg-red-950/20 p-2 w-full animate-pulse"><AlertTriangle className="inline w-3 h-3 mr-1" /> WARNING: TAMPERING VOIDS WARRANTY</p>
                <div className="flex flex-col gap-2 md:gap-3 w-full max-w-xs mt-2 md:mt-4">
                  {wires.map((wire) => (
                    <div key={wire.id} className="relative group">
                       <button onClick={() => { if (wire.status === 'intact') { soundEngine.playClick(); setShowWireModal(wire.id); } }} disabled={wire.status === 'cut'} className={`relative w-full h-8 md:h-10 border-b-2 flex items-center justify-between px-2 md:px-4 transition-all ${wire.status === 'cut' ? 'bg-black border-zinc-800 text-zinc-700' : `${wire.color} border-black shadow-md hover:brightness-75 active:translate-y-1`}`}>
                          <span className={`text-[10px] md:text-xs font-bold font-mono ${wire.status === 'cut' ? 'line-through' : 'text-white'}`}>{wire.status === 'cut' ? 'DISCONNECTED' : `CIRCUIT_${100 + wire.id}`}</span>
                          {wire.status === 'intact' && <Scissors className="w-3 h-3 md:w-4 md:h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
                          {wire.status === 'cut' && <div className="absolute right-2 top-1/2 -translate-y-1/2"><Zap className="w-3 h-3 md:w-4 md:h-4 text-yellow-900" /></div>}
                       </button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showWireModal !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-zinc-900 border-2 border-red-700 p-4 md:p-6 max-w-sm w-full shadow-[0_0_50px_rgba(255,0,0,0.2)] relative overflow-hidden">
                <div className="absolute inset-0 scanlines opacity-50 pointer-events-none"></div>
                <div className="flex items-center gap-3 text-red-600 mb-6 border-b border-red-900 pb-2 relative z-10"><AlertTriangle className="w-6 h-6 md:w-8 md:h-8 animate-pulse" /><h3 className="text-lg md:text-xl font-bold retro-font">DANGER</h3></div>
                <p className="text-zinc-300 text-xs md:text-sm leading-relaxed mb-8 font-mono relative z-10">SEVERING CONNECTION...<br/><br/>THIS ACTION CANNOT BE UNDONE.</p>
                <div className="flex gap-4 relative z-10">
                   <button onClick={() => { soundEngine.playClick(); setShowWireModal(null); }} className="flex-1 py-3 bg-black text-zinc-400 text-sm border border-zinc-700 hover:bg-zinc-800 font-mono">ABORT</button>
                   <button onClick={() => showWireModal !== null && handleCutWire(showWireModal)} className="flex-1 py-3 bg-red-900/50 text-red-500 text-sm font-bold border border-red-600 hover:bg-red-900 flex justify-center items-center gap-2 font-mono"><Scissors className="w-4 h-4" /> CUT</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && <SettingsPanel settings={settings} onUpdate={(s) => { soundEngine.playClick(); setSettings(s); }} onClose={() => { soundEngine.playClick(); setShowSettings(false); }} />}
      </AnimatePresence>

      <AnimatePresence>
        {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-4 overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-cover pointer-events-none mix-blend-screen" />
             <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center text-center max-w-lg w-full relative z-10">
               {gameState === 'GAME_OVER' ? <Skull className="w-16 h-16 md:w-24 md:h-24 text-red-700 mb-4 animate-bounce drop-shadow-[0_0_15px_red]" /> : <Trophy className="w-16 h-16 md:w-24 md:h-24 text-yellow-500 mb-4 animate-bounce drop-shadow-[0_0_15px_yellow]" />}
               <h2 className={`text-4xl md:text-7xl mb-4 retro-font ${gameState === 'GAME_OVER' ? 'text-red-600' : 'text-yellow-500'} text-glow`}>{gameState === 'GAME_OVER' ? 'GAME OVER' : '6:00 AM'}</h2>
               <div className="mb-8 p-4 md:p-6 bg-black border-2 border-zinc-800 w-full relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 px-2 text-zinc-500 text-[10px] md:text-xs font-mono uppercase">
                    {resultTheme.label} {/* DYNAMIC LABEL */}
                 </div>
                 <div className="text-2xl md:text-5xl text-white tracking-widest mt-2 retro-font">${totalPoints.toLocaleString()}</div>
               </div>
               <div className="flex flex-col gap-4 w-full font-mono">
                  {gameState === 'GAME_OVER' && !hasRevived ? (
                    <button onClick={handleRevive} className="group w-full py-3 md:py-4 bg-yellow-900/50 hover:bg-yellow-800/50 text-yellow-500 border border-yellow-700 transition-all relative overflow-hidden">
                       <span className="text-sm md:text-lg font-bold relative z-10 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> RESTART FLOOR {currentStage.id}</span>
                       <span className="block text-[10px] md:text-xs mt-1 relative z-10 opacity-75 uppercase">
                           PENALTY: -{Math.ceil(totalPoints / 2)} {resultTheme.currency} {/* DYNAMIC CURRENCY */}
                       </span>
                    </button>
                  ) : gameState === 'GAME_OVER' && hasRevived ? (
                    <div className="w-full py-4 bg-black text-red-900 border border-red-900 text-sm">SYSTEM LOCKED // NO REVIVES LEFT</div>
                  ) : null}
                  <button onClick={startNewGame} className="w-full py-3 md:py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 transition-colors text-sm">NEW GAME (FLOOR 1)</button>
                  
                  {/* EXIT BUTTON ON GAME OVER SCREEN */}
                  <button onClick={handleExit} className="w-full py-3 md:py-4 bg-black hover:bg-zinc-900 text-zinc-500 border border-zinc-800 transition-colors text-sm flex items-center justify-center gap-2">
                     <ArrowLeft className="w-4 h-4" /> EXIT TO MENU
                  </button>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};