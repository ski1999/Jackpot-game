
import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { SinglePlayerGame } from './components/SinglePlayerGame';
import { MultiplayerMenus } from './components/MultiplayerMenus';
import { Lobby } from './components/Lobby';
import { MultiplayerGame } from './components/MultiplayerGame';
import { SettingsPanel } from './components/SettingsPanel';
import { soundEngine } from './audio';
import { GameSettings } from './types';
import { GameProvider, useGame } from './contexts/GameContext';
import { CONFIG } from './config';

// Main Router Component (Wrapped inside GameProvider)
const GameRouter = () => {
  const [screen, setScreen] = useState<'LANDING' | 'SINGLE' | 'MULTI_MENU' | 'LOBBY' | 'MULTI_GAME'>('LANDING');
  const [nickname, setNickname] = useState('');
  const [settings, setSettings] = useState<GameSettings>({ volume: CONFIG.DEFAULT_VOLUME, speed: 'NORMAL', storyMode: false });
  const [showSettings, setShowSettings] = useState(false);

  // Get Multiplayer State from Context
  const { room, service } = useGame();

  useEffect(() => {
    soundEngine.setVolume(settings.volume);
    const handleInteract = () => {
        soundEngine.playAmbience();
        window.removeEventListener('click', handleInteract);
    };
    window.addEventListener('click', handleInteract);
    return () => {
        soundEngine.stopAmbience();
        window.removeEventListener('click', handleInteract);
    };
  }, [settings.volume]);

  // Handle Room Updates to switch screens
  useEffect(() => {
      if (room) {
          if (room.phase === 'LOBBY') {
              setScreen('LOBBY');
          } else {
              setScreen('MULTI_GAME');
          }
      } else if (screen === 'LOBBY' || screen === 'MULTI_GAME') {
          // If room was cleared (kick/disconnect), go back
          setScreen('LANDING');
      }
  }, [room, screen]);

  const handleStartMultiplayer = () => {
    if (nickname) {
        service.connect(nickname);
        setScreen('MULTI_MENU');
    } else {
        soundEngine.playWarning();
    }
  };

  return (
    <>
      {screen === 'LANDING' && (
          <LandingPage 
            nickname={nickname}
            setNickname={setNickname}
            onStartSingle={() => setScreen('SINGLE')}
            onStartMulti={handleStartMultiplayer}
            onOpenSettings={() => setShowSettings(true)}
          />
      )}

      {screen === 'SINGLE' && (
          <SinglePlayerGame onBack={() => setScreen('LANDING')} />
      )}

      {screen === 'MULTI_MENU' && (
          <MultiplayerMenus 
            onBack={() => setScreen('LANDING')}
          />
      )}

      {screen === 'LOBBY' && (
          <Lobby />
      )}

      {screen === 'MULTI_GAME' && (
          <MultiplayerGame />
      )}

      {showSettings && (
        <SettingsPanel 
            settings={settings}
            onUpdate={(s) => { soundEngine.playClick(); setSettings(s); }}
            onClose={() => { soundEngine.playClick(); setShowSettings(false); }}
        />
      )}
    </>
  );
};

export default function App() {
    return (
        <GameProvider>
            <GameRouter />
        </GameProvider>
    );
}
