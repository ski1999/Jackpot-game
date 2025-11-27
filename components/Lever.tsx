
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../audio';
import { SpinSpeed } from '../types';

interface LeverProps {
  onPull: () => void;
  disabled: boolean;
  speed: SpinSpeed;
  className?: string; // Allow overriding position
}

const LEVER_PARAMS: Record<SpinSpeed, { resetDelay: number; stiffness: number; damping: number }> = {
  FAST: { resetDelay: 250, stiffness: 500, damping: 25 },
  NORMAL: { resetDelay: 700, stiffness: 150, damping: 15 },
  SLOW: { resetDelay: 1200, stiffness: 50, damping: 20 },
};

export const Lever: React.FC<LeverProps> = ({ onPull, disabled, speed, className }) => {
  const [pulled, setPulled] = useState(false);
  const params = LEVER_PARAMS[speed];

  const handleClick = () => {
    if (disabled || pulled) {
      if (disabled) soundEngine.playClick(); // Error click
      return;
    }
    soundEngine.playLeverPull();
    setPulled(true);
    onPull();
    setTimeout(() => setPulled(false), params.resetDelay);
  };

  // Default positioning if no className provided
  const positionClasses = className || "absolute top-[180px] -right-[45px] xs:top-[220px] xs:-right-[60px] md:top-[280px] md:-right-[80px] scale-75 md:scale-100 origin-top-right";

  return (
    <div className={`${positionClasses} w-24 h-64 z-20 flex items-center pointer-events-auto select-none`}>
      
      {/* Base - Rusted Metal */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-32 bg-zinc-800 border-r-4 border-black shadow-xl" 
           style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.3) 5px, rgba(0,0,0,0.3) 10px)' }}>
           <div className="w-full h-full bg-orange-900/20 mix-blend-overlay"></div>
      </div>

      {/* Pivot Point */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
        <div className="w-20 h-20 bg-zinc-900 border-4 border-black rounded-full flex items-center justify-center shadow-lg relative">
            <div className="absolute inset-0 rounded-full border-2 border-zinc-700 opacity-50"></div>
            {/* Bolts */}
            <div className="absolute top-2 w-2 h-2 bg-zinc-600 rounded-full shadow-inner"></div>
            <div className="absolute bottom-2 w-2 h-2 bg-zinc-600 rounded-full shadow-inner"></div>
            <div className="absolute left-2 w-2 h-2 bg-zinc-600 rounded-full shadow-inner"></div>
            <div className="absolute right-2 w-2 h-2 bg-zinc-600 rounded-full shadow-inner"></div>
            
            <div className="w-8 h-8 bg-black rounded-full border-2 border-zinc-700" />
        </div>
      </div>

      {/* Handle Arm - Hazard Strips */}
      <motion.div
        className="absolute left-10 top-1/2 w-6 h-40 bg-yellow-600 border-x-2 border-black origin-bottom cursor-pointer"
        style={{ 
            x: '-50%', 
            y: '-100%',
            backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 10px, #eab308 10px, #eab308 20px)'
        }}
        animate={{ rotate: pulled ? 150 : 0 }}
        transition={{ 
            type: "spring", 
            stiffness: params.stiffness, 
            damping: params.damping,
            restDelta: 0.001
        }}
        onClick={handleClick}
      >
          {/* Knob - Red Ball */}
          <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-14 h-14 bg-red-800 rounded-full border-4 border-black transition-all shadow-[inset_-5px_-5px_10px_rgba(0,0,0,0.5)] ${disabled ? 'grayscale opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'}`}>
              <div className="absolute top-3 right-3 w-4 h-4 bg-red-400 rounded-full opacity-30 blur-sm" />
          </div>
      </motion.div>
    </div>
  );
};
