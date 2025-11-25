import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SYMBOLS } from '../constants';
import { SlotSymbol } from '../types';

interface ReelProps {
  spinning: boolean;
  targetSymbol: SlotSymbol | null;
  delay: number;
}

// Duplicate symbols to create a seamless loop effect
const REEL_SYMBOLS = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS];

export const Reel: React.FC<ReelProps> = ({ spinning, targetSymbol, delay }) => {
  const [offset, setOffset] = useState(0);
  const [finalSymbol, setFinalSymbol] = useState<SlotSymbol>(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

  useEffect(() => {
    if (spinning) {
      // Start continuous spinning logic
      const interval = setInterval(() => {
        setOffset((prev) => prev + 50); // Speed of spin
      }, 50);
      return () => clearInterval(interval);
    } else if (targetSymbol) {
      // Stop logic: Snap to target
      // In a real complex app we'd calculate exact pixel offset. 
      // Here we just set the symbol effectively.
      setFinalSymbol(targetSymbol);
      setOffset(0);
    }
  }, [spinning, targetSymbol]);

  return (
    <div className="relative w-24 h-32 bg-white border-x-4 border-slate-300 overflow-hidden flex flex-col items-center justify-center rounded-sm reel-shadow">
      <div className="absolute inset-0 pointer-events-none z-10 reel-shadow"></div>
      
      {spinning ? (
        <motion.div
          className="flex flex-col items-center space-y-4 blur-sm"
          animate={{ y: [0, -200] }}
          transition={{ repeat: Infinity, duration: 0.2, ease: "linear" }}
        >
          {REEL_SYMBOLS.map((s, i) => (
            <div key={i} className={`text-5xl ${s.color} h-16 flex items-center justify-center`}>
              {s.char}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`text-6xl ${finalSymbol.color} flex items-center justify-center drop-shadow-md`}
        >
          {finalSymbol.char}
        </motion.div>
      )}
    </div>
  );
};