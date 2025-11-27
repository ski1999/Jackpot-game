
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Volume2, VolumeX, Gauge, BookOpen, Copy, Check } from 'lucide-react';
import { SpinSpeed, GameSettings } from '../types';
import { useGame } from '../contexts/GameContext';

interface SettingsPanelProps {
  settings: GameSettings;
  onUpdate: (s: GameSettings) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose }) => {
  const { playerId } = useGame();
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    // Attempt to parse out the real persistent UUID if available, or fallback to the session ID
    // In production, playerId might be just the session ID if no persistence
    // But our GameContext provides the best ID available.
    navigator.clipboard.writeText(playerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border-2 border-green-700 p-6 max-w-sm w-full shadow-[0_0_20px_rgba(0,255,0,0.1)] relative max-h-[90vh] overflow-y-auto"
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-zinc-500 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl text-green-500 retro-font mb-6 flex items-center gap-2">
          <Gauge className="w-6 h-6" /> SYSTEM_CONFIG
        </h2>

        <div className="space-y-6">
          
          {/* Employee ID (Persistence) */}
          <div className="space-y-2 bg-black p-3 border border-zinc-800">
             <label className="text-[10px] text-zinc-500 font-mono uppercase block">Employee ID Badge</label>
             <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-900 p-2 text-xs text-green-600 font-mono truncate border border-zinc-700 select-all">
                  {playerId || "GENERATING..."}
                </code>
                <button 
                  onClick={handleCopyId}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-400 hover:text-white"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
             </div>
             <p className="text-[10px] text-zinc-600">
               Save this ID to recover your stats on another device.
             </p>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
             <label className="text-xs text-green-700 font-mono uppercase block">Audio Output Level</label>
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => onUpdate({ ...settings, volume: settings.volume === 0 ? 0.5 : 0 })}
                  className="text-green-500 hover:text-green-400"
                >
                  {settings.volume === 0 ? <VolumeX /> : <Volume2 />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={settings.volume}
                  onChange={(e) => onUpdate({ ...settings, volume: parseFloat(e.target.value) })}
                  className="w-full accent-green-600 bg-black h-2 rounded-lg appearance-none cursor-pointer"
                />
             </div>
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
             <label className="text-xs text-green-700 font-mono uppercase block">Processor Speed (Spin Rate)</label>
             <div className="grid grid-cols-3 gap-2">
               {(['SLOW', 'NORMAL', 'FAST'] as SpinSpeed[]).map((speed) => (
                 <button
                   key={speed}
                   onClick={() => onUpdate({ ...settings, speed })}
                   className={`
                     py-2 px-1 text-xs font-mono border transition-all
                     ${settings.speed === speed 
                       ? 'bg-green-900/50 border-green-500 text-white shadow-[0_0_10px_rgba(0,255,0,0.3)]' 
                       : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}
                   `}
                 >
                   {speed}
                 </button>
               ))}
             </div>
          </div>

          {/* Story Mode Toggle */}
          <div className="space-y-2">
             <label className="text-xs text-green-700 font-mono uppercase block">Narrative Protocol</label>
             <div className="flex items-center justify-between bg-black border border-zinc-800 p-2">
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                   <BookOpen className="w-4 h-4" />
                   STORY MODE
                </div>
                <button
                   onClick={() => onUpdate({ ...settings, storyMode: !settings.storyMode })}
                   className={`
                     relative w-12 h-6 transition-colors border
                     ${settings.storyMode ? 'bg-green-900 border-green-600' : 'bg-zinc-900 border-zinc-700'}
                   `}
                >
                   <motion.div 
                     initial={false}
                     animate={{ x: settings.storyMode ? 24 : 0 }}
                     className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white shadow-sm ${settings.storyMode ? 'bg-green-400' : 'bg-zinc-500'}`}
                   />
                </button>
             </div>
             <p className="text-[10px] text-zinc-600 font-mono">
               {settings.storyMode ? "PRIZE DRAWER WILL DISPENSE ARCHIVED LOGS." : "PRIZE DRAWER WILL DISPENSE BONUS TOKENS."}
             </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-800 text-center">
          <button 
             onClick={onClose}
             className="w-full py-2 bg-green-900/20 text-green-500 border border-green-800 hover:bg-green-900/40 font-mono text-sm"
          >
            CONFIRM CHANGES
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
};
