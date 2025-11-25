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
  // Memoize the loop symbols so they update when the stage changes
  const reelSymbols = useMemo(() => [...symbols, ...symbols, ...symbols], [symbols]);
  
  const [finalSymbol, setFinalSymbol] = useState<SlotSymbol>(symbols[0]);

  // Update initial symbol when stage/symbols change
  useEffect(() => {
    setFinalSymbol(symbols[Math.floor(Math.random() * symbols.length)]);
  }, [symbols]);

  useEffect(() => {
    if (!spinning && targetSymbol) {
      setFinalSymbol(targetSymbol);
    }
  }, [spinning, targetSymbol]);

  return (
    <div className="relative w-20 h-28 md:w-24 md:h-32 bg-white border-x-4 border-slate-400 overflow-hidden flex flex-col items-center justify-center rounded-sm reel-shadow">
      <div className="absolute inset-0 pointer-events-none z-10 reel-shadow bg-gradient-to-b from-black/20 via-transparent to-black/20"></div>
      
      {spinning ? (
        <motion.div
          className="flex flex-col items-center space-y-4 blur-[2px]"
          animate={{ y: [0, -200] }}
          transition={{ repeat: Infinity, duration: 0.15, ease: "linear" }}
        >
          {reelSymbols.map((s, i) => (
            <div key={i} className={`text-4xl md:text-5xl ${s.color} h-16 flex items-center justify-center opacity-80`}>
              {s.char}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={finalSymbol.id} // Re-render animation on change
          initial={{ y: -50, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`text-5xl md:text-6xl ${finalSymbol.color} flex items-center justify-center drop-shadow-md`}
        >
          {finalSymbol.char}
        </motion.div>
      )}
    </div>
  );
};
