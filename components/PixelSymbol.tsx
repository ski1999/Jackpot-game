import React from 'react';

interface PixelSymbolProps {
  shape?: string[];
  color: string;
  size?: number;
}

export const PixelSymbol: React.FC<PixelSymbolProps> = ({ shape, color, size = 48 }) => {
  if (!shape) return null;

  const width = shape[0].length;
  const height = shape.length;
  const pixelSize = size / Math.max(width, height);

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${width} ${height}`} 
      shapeRendering="crispEdges" // Crucial for pixel art look
      className="drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]"
    >
      {shape.map((row, y) => (
        row.split('').map((cell, x) => {
          if (cell === '1') {
            return (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={color}
              />
            );
          }
          return null;
        })
      ))}
    </svg>
  );
};