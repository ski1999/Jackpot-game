
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Users, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { soundEngine } from '../audio';
import { MultiplayerConfig } from '../types';

interface MultiplayerMenusProps {
  onBack: () => void;
  onCreateRoom: (config: MultiplayerConfig) => void;
  onJoinRoom: (code: string, pass: string) => void;
  error?: string;
}

export const MultiplayerMenus: React.FC<MultiplayerMenusProps> = ({ onBack, onCreateRoom, onJoinRoom, error }) => {
  const [view, setView] = useState<'MENU' | 'CREATE' | 'JOIN'>('MENU');
  
  // Create Room State
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [numLosers, setNumLosers] = useState(1);
  const [numWinners, setNumWinners] = useState(1);
  const [password, setPassword] = useState('');

  // Join Room State
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');

  const handleCreate = () => {
    if (numLosers + numWinners >= maxPlayers) {
        soundEngine.playWarning();
        return; // Validation handled by UI disabling usually, but redundant check
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    onCreateRoom({
        roomCode: code,
        password: password || undefined,
        maxPlayers,
        numLosers,
        numWinners
    });
  };

  const isValidConfig = (numLosers + numWinners) < maxPlayers;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4 font-mono text-green-500 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,black_80%)] z-10" />
      
      <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className="relative z-20 w-full max-w-md bg-zinc-900 border-2 border-yellow-800 shadow-[0_0_30px_rgba(161,98,7,0.1)] p-6 md:p-8"
      >
         {/* Header */}
         <div className="flex items-center justify-between mb-8 border-b border-yellow-900/50 pb-4">
             <button onClick={() => { soundEngine.playClick(); view === 'MENU' ? onBack() : setView('MENU'); }} className="text-zinc-500 hover:text-yellow-500">
                <ArrowLeft />
             </button>
             <h2 className="text-xl text-yellow-500 retro-font">
                {view === 'MENU' ? 'NETWORK_CONNECTION' : view === 'CREATE' ? 'HOST_PROTOCOL' : 'REMOTE_ACCESS'}
             </h2>
             <div className="w-6" /> {/* Spacer */}
         </div>

         {error && (
            <div className="mb-6 p-3 bg-red-950/50 border border-red-800 text-red-500 text-xs flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                {error}
            </div>
         )}

         {/* MAIN MENU */}
         {view === 'MENU' && (
             <div className="flex flex-col gap-4">
                 <button 
                    onClick={() => { soundEngine.playClick(); setView('CREATE'); }}
                    className="p-6 bg-black border border-zinc-700 hover:border-yellow-500 text-left group transition-all"
                 >
                    <div className="text-yellow-500 font-bold mb-1 group-hover:translate-x-1 transition-transform">CREATE SERVER</div>
                    <div className="text-xs text-zinc-500">Initialize new game instance. Configure hazards and rewards.</div>
                 </button>
                 <button 
                    onClick={() => { soundEngine.playClick(); setView('JOIN'); }}
                    className="p-6 bg-black border border-zinc-700 hover:border-green-500 text-left group transition-all"
                 >
                    <div className="text-green-500 font-bold mb-1 group-hover:translate-x-1 transition-transform">JOIN SERVER</div>
                    <div className="text-xs text-zinc-500">Connect to existing instance via access code.</div>
                 </button>
             </div>
         )}

         {/* CREATE FORM */}
         {view === 'CREATE' && (
             <div className="space-y-6">
                 <div className="space-y-2">
                     <label className="text-xs text-zinc-500 uppercase">Max Players</label>
                     <input type="range" min="3" max="10" value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))} className="w-full accent-yellow-600 h-2 bg-black rounded-lg appearance-none cursor-pointer" />
                     <div className="text-right text-yellow-500 font-bold">{maxPlayers}</div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" /> Losers (Boom)
                        </label>
                        <input type="number" min="1" max={maxPlayers - 2} value={numLosers} onChange={(e) => setNumLosers(parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 p-2 text-red-500 focus:border-red-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                            <Users className="w-3 h-3 text-green-500" /> Winners
                        </label>
                        <input type="number" min="1" max={maxPlayers - numLosers - 1} value={numWinners} onChange={(e) => setNumWinners(parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 p-2 text-green-500 focus:border-green-500 outline-none" />
                    </div>
                 </div>

                 {!isValidConfig && (
                     <p className="text-[10px] text-red-500">Error: Sum of winners and losers must be less than player count.</p>
                 )}

                 <div className="space-y-2">
                     <label className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                         <Lock className="w-3 h-3" /> Password (Optional)
                     </label>
                     <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="NO PASSWORD" className="w-full bg-black border border-zinc-800 p-2 text-yellow-500 focus:border-yellow-500 outline-none uppercase" maxLength={8} />
                 </div>

                 <button 
                    disabled={!isValidConfig}
                    onClick={() => { soundEngine.playClick(); handleCreate(); }}
                    className="w-full py-4 bg-yellow-900/20 border border-yellow-700 text-yellow-500 hover:bg-yellow-900/40 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                 >
                    GENERATE LOBBY
                 </button>
             </div>
         )}

         {/* JOIN FORM */}
         {view === 'JOIN' && (
             <div className="space-y-6">
                 <div className="space-y-2">
                     <label className="text-xs text-zinc-500 uppercase">Room Code</label>
                     <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="w-full bg-black border border-zinc-800 p-4 text-center text-2xl tracking-widest text-green-500 focus:border-green-500 outline-none uppercase" />
                 </div>

                 <div className="space-y-2">
                     <label className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                         <Lock className="w-3 h-3" /> Password
                     </label>
                     <input type="text" value={joinPass} onChange={(e) => setJoinPass(e.target.value)} placeholder="REQUIRED IF SET" className="w-full bg-black border border-zinc-800 p-2 text-green-500 focus:border-green-500 outline-none uppercase" />
                 </div>

                 <button 
                    disabled={joinCode.length < 6}
                    onClick={() => { soundEngine.playClick(); onJoinRoom(joinCode, joinPass); }}
                    className="w-full py-4 bg-green-900/20 border border-green-700 text-green-500 hover:bg-green-900/40 disabled:opacity-50 disabled:cursor-not-allowed font-bold mt-8"
                 >
                    CONNECT TO SYSTEM
                 </button>
             </div>
         )}

      </motion.div>
    </div>
  );
};
