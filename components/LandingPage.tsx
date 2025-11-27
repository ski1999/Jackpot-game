
import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Users, Play, Skull } from 'lucide-react';
import { soundEngine } from '../audio';

interface LandingPageProps {
  onStartSingle: () => void;
  onStartMulti: () => void;
  onOpenSettings: () => void;
  nickname: string;
  setNickname: (name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onStartSingle, 
  onStartMulti, 
  onOpenSettings,
  nickname,
  setNickname
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden text-green-500 font-mono p-4">
       {/* Background */}
       <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,black_90%)] z-10" />
       <div className="absolute inset-0 checkerboard opacity-20 pointer-events-none" />

       <div className="relative z-20 flex flex-col items-center gap-6 md:gap-8 max-w-md w-full">
          
          {/* Title */}
          <div className="text-center space-y-2">
             <div className="flex justify-center mb-2 md:mb-4">
                <Skull className="w-12 h-12 md:w-16 md:h-16 text-red-600 animate-pulse drop-shadow-[0_0_15px_red]" />
             </div>
             <h1 className="text-3xl md:text-5xl retro-font text-red-600 drop-shadow-[0_0_10px_red] tracking-wider">
               FAZ-SLOTS
             </h1>
             <p className="text-[10px] md:text-sm text-green-800 font-bold uppercase tracking-[0.5em] animate-pulse">
               System Initialized
             </p>
          </div>

          {/* Nickname Input */}
          <div className="w-full bg-black border-2 border-green-800 p-3 md:p-4 shadow-[0_0_20px_rgba(0,255,0,0.1)]">
             <label className="block text-xs text-green-700 mb-2 uppercase">Identify Yourself</label>
             <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-green-600">{">"}</span>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.toUpperCase())}
                  placeholder="ENTER_NAME..."
                  maxLength={12}
                  className="w-full bg-zinc-900 border border-green-900 py-2 pl-8 pr-4 text-green-400 focus:outline-none focus:border-green-500 font-mono uppercase tracking-widest text-sm md:text-base"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-4 bg-green-500 animate-blink"></span>
             </div>
          </div>

          {/* Menu Actions */}
          <div className="flex flex-col gap-3 md:gap-4 w-full">
             <button 
               onClick={() => { soundEngine.playClick(); onStartSingle(); }}
               className="group w-full py-3 md:py-4 bg-zinc-900 border-2 border-green-800 hover:bg-green-900/20 hover:border-green-500 transition-all relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-green-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 skew-x-12" />
                <div className="flex items-center justify-center gap-3 relative z-10">
                   <Play className="w-4 h-4 md:w-5 md:h-5" />
                   <span className="text-sm md:text-lg font-bold">SOLO NIGHT SHIFT</span>
                </div>
             </button>

             <button 
               onClick={() => { 
                 if (!nickname) {
                   soundEngine.playWarning(); // Play warning sound
                   return;
                 }
                 soundEngine.playClick(); 
                 onStartMulti(); 
               }}
               className={`group w-full py-3 md:py-4 bg-zinc-900 border-2 border-yellow-800 hover:bg-yellow-900/20 hover:border-yellow-500 transition-all relative overflow-hidden ${!nickname ? 'opacity-50 grayscale' : ''}`}
             >
                <div className="absolute inset-0 bg-yellow-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 skew-x-12" />
                <div className="flex items-center justify-center gap-3 relative z-10 text-yellow-500">
                   <Users className="w-4 h-4 md:w-5 md:h-5" />
                   <span className="text-sm md:text-lg font-bold">MULTIPLAYER LOBBY</span>
                </div>
                {!nickname && (
                  <div className="absolute bottom-0.5 w-full text-center text-[8px] text-red-500 uppercase">
                    Authentication Required (Enter Name)
                  </div>
                )}
             </button>

             <button 
               onClick={() => { soundEngine.playClick(); onOpenSettings(); }}
               className="w-full py-3 bg-black border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors flex items-center justify-center gap-2 text-xs md:text-sm"
             >
                <Settings className="w-4 h-4" />
                SYSTEM CONFIG
             </button>
          </div>

          <div className="text-[10px] text-zinc-700 text-center max-w-xs leading-relaxed">
             WARNING: Fazbear Entertainment is not responsible for accidental death, dismemberment, or digital entrapment.
          </div>
       </div>
    </div>
  );
};
