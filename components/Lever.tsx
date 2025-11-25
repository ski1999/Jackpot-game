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
    <div className="absolute top-[280px] -right-[80px] w-24 h-64 z-20 flex items-center pointer-events-auto select-none">
      
      {/* Base Connector - Blocky */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-24 bg-slate-800 border-4 border-black shadow-xl" />

      {/* Pivot Point - Blocky */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
        <div className="w-16 h-16 bg-slate-700 border-4 border-black flex items-center justify-center">
            <div className="w-6 h-6 bg-slate-900 border-2 border-slate-600" />
        </div>
      </div>

      {/* Handle Arm */}
      <motion.div
        className="absolute left-10 top-1/2 w-4 h-40 bg-gradient-to-r from-slate-400 to-slate-600 border-x-2 border-black origin-bottom cursor-pointer"
        style={{ x: '-50%', y: '-100%' }} // Position bottom of stick at pivot center
        animate={{ rotate: pulled ? 150 : 0 }}
        transition={{ 
            type: "spring", 
            stiffness: 150, 
            damping: 12,
            restDelta: 0.001
        }}
        onClick={handleClick}
      >
          {/* Knob - Blocky */}
          <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-14 h-14 bg-red-600 border-4 border-black transition-all ${disabled ? 'grayscale opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'}`}>
              <div className="absolute top-2 right-2 w-4 h-4 bg-white opacity-40" />
          </div>
      </motion.div>
    </div>
  );
};
