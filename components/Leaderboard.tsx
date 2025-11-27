

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, X, Medal } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { PlayerStats } from '../types';
import { soundEngine } from '../audio';

interface LeaderboardProps {
  onClose: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
  const { service } = useGame();
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
       const data = await service.getLeaderboard();
       setStats(data);
       setLoading(false);
    };
    fetchLeaderboard();
  }, [service]);

  // Ensure we always have 10 rows
  const displayRows = Array.from({ length: 10 }).map((_, i) => stats[i] || null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm font-mono"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border-4 border-yellow-600 p-6 max-w-lg w-full shadow-[0_0_50px_rgba(234,179,8,0.2)] relative max-h-[90vh] overflow-hidden flex flex-col"
      >
        <button 
          onClick={() => { soundEngine.playClick(); onClose(); }}
          className="absolute top-2 right-2 text-zinc-500 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
           <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2 animate-bounce drop-shadow-[0_0_10px_yellow]" />
           <h2 className="text-2xl md:text-3xl retro-font text-yellow-500 text-glow">WEEKLY TOP 10</h2>
           <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
              RESET IN: {7 - new Date().getDay()} DAYS
           </p>
        </div>

        <div className="flex-1 overflow-y-auto border-2 border-zinc-800 bg-black p-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] md:text-xs text-zinc-500 uppercase border-b border-zinc-800 pb-2 mb-2 font-bold text-center">
                <div className="col-span-2">Rank</div>
                <div className="col-span-4 text-left pl-2">Gambler</div>
                <div className="col-span-3">High Score</div>
                <div className="col-span-3">Floors</div>
            </div>
            
            {loading ? (
                <div className="text-center py-8 text-green-500 animate-pulse">FETCHING DATA...</div>
            ) : (
                displayRows.map((s, i) => (
                   <div key={i} className={`grid grid-cols-12 gap-2 items-center text-xs md:text-sm py-2 border-b border-zinc-900 ${s ? (i < 3 ? 'text-white' : 'text-zinc-400') : 'text-zinc-800 opacity-50'}`}>
                      <div className="col-span-2 flex justify-center">
                         {i === 0 && <Medal className={`w-4 h-4 ${s ? 'text-yellow-400' : 'text-zinc-800'}`} />}
                         {i === 1 && <Medal className={`w-4 h-4 ${s ? 'text-gray-400' : 'text-zinc-800'}`} />}
                         {i === 2 && <Medal className={`w-4 h-4 ${s ? 'text-amber-700' : 'text-zinc-800'}`} />}
                         {i > 2 && <span className={s ? "text-zinc-600" : "text-zinc-800"}>#{i + 1}</span>}
                      </div>
                      <div className={`col-span-4 pl-2 font-bold truncate ${s ? 'text-green-500' : 'text-zinc-800 italic'}`}>
                          {s ? s.nickname : 'VACANT'}
                      </div>
                      <div className={`col-span-3 text-center font-mono ${s ? 'text-yellow-500' : 'text-zinc-800'}`}>
                          {s ? `$${s.high_score.toLocaleString()}` : '---'}
                      </div>
                      <div className={`col-span-3 text-center ${s ? 'text-zinc-300' : 'text-zinc-800'}`}>
                          {s ? s.wins : '-'}
                      </div>
                   </div>
                ))
            )}
        </div>

        <div className="mt-4 text-center text-[10px] text-zinc-600">
           STATS ARE ARCHIVED WEEKLY. OLD RECORDS SENT TO COLD STORAGE.
        </div>

      </motion.div>
    </motion.div>
  );
};