import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface LeverProps {
  onPull: () => void;
  disabled: boolean;
}

export const Lever: React.FC<LeverProps> = ({ onPull, disabled }) => {
  const [pulled, setPulled] = useState(false);

  const handleClick = () => {
    if (disabled || pulled) return;
    setPulled(true);
    onPull();
    setTimeout(() => setPulled(false), 2000); // Reset after animation cycle
  };

  return (
    <div className="absolute top-[300px] -right-[90px] w-24 h-64 z-20 flex items-center pointer-events-auto select-none">
      {/* Base attached to machine */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-20 bg-slate-800 border-r-2 border-y-2 border-slate-600 rounded-r-lg shadow-xl" />

      {/* Pivot */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <div className="w-16 h-16 rounded-full bg-slate-700 border-4 border-slate-900 shadow-inner flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-slate-900 shadow-sm" />
        </div>
      </div>

      {/* Handle */}
      <motion.div
        className="absolute left-12 top-1/2 w-4 h-48 bg-gradient-to-r from-slate-300 to-slate-500 border border-slate-600 rounded-full origin-bottom cursor-pointer"
        style={{ x: '-50%', y: '-100%' }} // Position bottom of stick at pivot center
        animate={{ rotate: pulled ? 150 : 0 }}
        transition={{ 
            type: "spring", 
            stiffness: 120, 
            damping: 15,
            restDelta: 0.001
        }}
        onClick={handleClick}
      >
          {/* Ball */}
          <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-red-600 border-b-4 border-red-800 shadow-2xl transition-all ${disabled ? 'grayscale opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}>
              <div className="absolute top-3 right-4 w-4 h-4 bg-white rounded-full opacity-40 blur-[2px]" />
          </div>
      </motion.div>
    </div>
  );
};