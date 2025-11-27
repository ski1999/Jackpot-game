
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SlotSymbol, SpinSpeed } from '../types';
import { PixelSymbol } from './PixelSymbol';
import { SPEED_CONFIG } from '../constants';
import { soundEngine } from '../audio';

interface ReelProps {
  spinning: boolean;
  targetSymbol: SlotSymbol | null;
  delay: number;
  symbols: SlotSymbol[];
  speed: SpinSpeed;
}

export const Reel: React.FC<ReelProps> = ({ spinning, targetSymbol, delay, symbols, speed }) => {
  const reelSymbols = useMemo(() => [...symbols, ...symbols, ...symbols], [symbols]);
  const [finalSymbol, setFinalSymbol] = useState<SlotSymbol>(symbols[0]);
  const config = SPEED_CONFIG[speed];

  useEffect(() => {
    // Random initial symbol
    setFinalSymbol(symbols[Math.floor(Math.random() * symbols.length)]);
  }, [symbols]);

  useEffect(() => {
    if (!spinning && targetSymbol) {
      setFinalSymbol(targetSymbol);
    }
  }, [spinning, targetSymbol]);

  return (
    <div className="relative w-16 h-24 xs:w-20 xs:h-28 md:w-24 md:h-32 bg-black border-2 border-zinc-800 overflow-hidden flex flex-col items-center justify-center reel-shadow">
      {/* Dirty glass overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 reel-shadow bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
      
      {spinning ? (
        <motion.div
          className="flex flex-col items-center space-y-4 blur-[1px]"
          animate={{ y: [0, -200] }}
          transition={{ 
            repeat: Infinity, 
            duration: config.spinInterval / 1000, // Convert ms to s
            ease: "linear" 
          }}
        >
          {reelSymbols.map((s, i) => (
            <div key={i} className={`h-16 flex items-center justify-center opacity-70`}>
              {s.shape ? (
                <div className="scale-75 md:scale-100">
                    <PixelSymbol shape={s.shape} color={s.color} size={48} />
                </div>
              ) : (
                <div className={`text-4xl ${s.color}`}>{s.char}</div>
              )}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={finalSymbol.id}
          initial={{ y: -50, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`flex items-center justify-center drop-shadow-[0_0_10px_currentColor]`}
        >
          {finalSymbol.shape ? (
             <div className="scale-[0.6] xs:scale-75 md:scale-100 transform-gpu">
                <PixelSymbol shape={finalSymbol.shape} color={finalSymbol.color} size={64} />
             </div>
          ) : (
             <div className={`text-4xl md:text-6xl ${finalSymbol.color}`}>{finalSymbol.char}</div>
          )}
        </motion.div>
      )}
    </div>
  );
};
