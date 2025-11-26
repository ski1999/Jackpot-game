
import React, { createContext, useContext, useEffect, useState } from 'react';
import { IGameService } from '../services/IGameService';
import { MockGameService } from '../services/MockGameService';
import { SocketGameService } from '../services/SocketGameService';
import { CONFIG } from '../config';
import { MultiplayerRoom } from '../types';

interface GameContextType {
  service: IGameService;
  room: MultiplayerRoom | null;
  error: string | null;
  playerId: string;
}

const GameContext = createContext<GameContextType | null>(null);

// Singleton instances to persist across re-renders
const mockService = new MockGameService();
const socketService = new SocketGameService();

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [service] = useState<IGameService>(() => 
    CONFIG.USE_MOCK_SERVICE ? mockService : socketService
  );
  
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    // Subscribe to state updates
    const unsubRoom = service.subscribe((r) => {
        setRoom(r ? { ...r } : null); // Spread to force re-render
        setPlayerId(service.getPlayerId());
    });
    
    const unsubError = service.subscribeError((e) => setError(e));

    return () => {
        unsubRoom();
        unsubError();
    };
  }, [service]);

  return (
    <GameContext.Provider value={{ service, room, error, playerId }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
};
