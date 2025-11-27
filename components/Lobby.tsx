
import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { soundEngine } from '../audio';
import { useGame } from '../contexts/GameContext';

export const Lobby: React.FC = () => {
  const { room, playerId, service } = useGame();
  
  if (!room) return null;

  const isHost = room.players.find(p => p.id === playerId)?.isHost;
  const missingPlayers = room.config.maxPlayers - room.players.length;

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-zinc-950 text-green-500 font-mono p-4 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,black_90%)] z-10 pointer-events-none" />
        
        {/* Header */}
        <div className="w-full max-w-2xl flex justify-between items-center mb-8 border-b-2 border-green-900 pb-4 z-20 mt-8">
            <div>
                <h2 className="text-xl md:text-3xl retro-font text-white">LOBBY: {room.config.roomCode}</h2>
                <div className="text-[10px] md:text-xs text-zinc-500 mt-1">PASSWORD: {room.config.password || 'NONE'}</div>
            </div>
            <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-yellow-500">{room.players.length}/{room.config.maxPlayers}</div>
                <div className="text-[10px] md:text-xs text-zinc-500 uppercase">Players Connected</div>
            </div>
        </div>

        {/* Player Grid */}
        <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 z-20 mb-8">
            {room.players.map((player) => (
                <motion.div 
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-zinc-900 border-2 p-2 md:p-4 flex flex-col items-center justify-center h-24 md:h-32 relative overflow-hidden ${player.id === playerId ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-zinc-700'}`}
                >
                    {player.isHost && (
                        <div className="absolute top-1 right-1 text-[8px] bg-yellow-900 text-yellow-500 px-1">HOST</div>
                    )}
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-black rounded-full border border-zinc-700 mb-2 flex items-center justify-center text-xl md:text-2xl">
                        {['🐻', '🐰', '🐔', '🦊', '🐊', '🐺'][player.avatarId % 6]}
                    </div>
                    <div className="text-xs md:text-sm font-bold uppercase truncate w-full text-center">{player.nickname}</div>
                    <div className="text-[10px] md:text-xs text-green-600 animate-pulse mt-1">CONNECTED</div>
                </motion.div>
            ))}
            
            {/* Empty Slots */}
            {Array.from({ length: missingPlayers }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-black border-2 border-dashed border-zinc-800 p-2 md:p-4 flex flex-col items-center justify-center h-24 md:h-32 opacity-50">
                    <Clock className="w-6 h-6 md:w-8 md:h-8 text-zinc-700 mb-2 animate-spin-slow" />
                    <div className="text-[10px] md:text-xs text-zinc-700 uppercase">Waiting...</div>
                </div>
            ))}
        </div>

        {/* Config Summary */}
        <div className="w-full max-w-2xl mt-auto p-3 md:p-4 bg-black border border-zinc-800 text-center z-20 text-[10px] md:text-xs text-zinc-400">
            GAME RULES: <span className="text-red-500">{room.config.numLosers} BOMB(S)</span> | <span className="text-green-500">{room.config.numWinners} WINNER(S)</span> | {room.config.maxPlayers - room.config.numLosers - room.config.numWinners} SURVIVORS
        </div>

        {/* Actions */}
        <div className="mt-4 mb-8 w-full max-w-md flex flex-col gap-4 z-20">
            {isHost ? (
                missingPlayers > 0 ? (
                    <div className="bg-yellow-900/20 border border-yellow-800 p-3 text-center text-yellow-600 text-xs md:text-sm">
                        WAITING FOR PLAYERS TO FILL ROOM...
                    </div>
                ) : (
                    <button 
                        onClick={() => { soundEngine.playClick(); service.startGame(); }}
                        className="w-full py-3 md:py-4 bg-green-900/20 border-2 border-green-500 text-green-500 hover:bg-green-900/40 font-bold text-base md:text-lg animate-pulse"
                    >
                        START SEQUENCE
                    </button>
                )
            ) : (
                <div className="text-center text-zinc-500 text-xs md:text-sm animate-pulse">
                    WAITING FOR HOST TO START...
                </div>
            )}
            
            <button 
                onClick={() => { soundEngine.playClick(); service.leaveRoom(); }}
                className="w-full py-3 bg-zinc-900 border border-red-900 text-red-700 hover:bg-red-900/20 text-xs md:text-sm"
            >
                DISCONNECT
            </button>
        </div>
    </div>
  );
};
