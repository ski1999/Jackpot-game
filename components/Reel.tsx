import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SlotSymbol } from '../types';

interface ReelProps {
  spinning: boolean;
  targetSymbol: SlotSymbol | null;
  delay: number;
  symbols: SlotSymbol[];
}

export const Reel: React.FC<ReelProps> = ({ spinning, targetSymbol, delay, symbols }) => {
  const reelSymbols = useMemo(() => [...symbols, ...symbols, ...symbols], [symbols]);
  
  const [finalSymbol, setFinalSymbol] = useState<SlotSymbol>(symbols[0]);

  useEffect(() => {
    setFinalSymbol(symbols[Math.floor(Math.random() * symbols.length)]);
  }, [symbols]);

  useEffect(() => {
    if (!spinning && targetSymbol) {
      setFinalSymbol(targetSymbol);
    }
  }, [spinning, targetSymbol]);

  return (
    <div className="relative w-20 h-28 md:w-24 md:h-32 bg-black border-2 border-zinc-800 overflow-hidden flex flex-col items-center justify-center reel-shadow">
      {/* Dirty glass overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 reel-shadow bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
      
      {spinning ? (
        <motion.div
          className="flex flex-col items-center space-y-4 blur-[1px]"
          animate={{ y: [0, -200] }}
          transition={{ repeat: Infinity, duration: 0.15, ease: "linear" }}
        >
          {reelSymbols.map((s, i) => (
            <div key={i} className={`text-4xl md:text-5xl ${s.color} h-16 flex items-center justify-center opacity-70 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>
              {s.char}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={finalSymbol.id}
          initial={{ y: -50, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`text-5xl md:text-6xl ${finalSymbol.color} flex items-center justify-center drop-shadow-[0_0_10px_currentColor]`}
        >
          {finalSymbol.char}
        </motion.div>
      )}
    </div>
  );
};