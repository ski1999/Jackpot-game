
import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { SinglePlayerGame } from './components/SinglePlayerGame';
import { MultiplayerMenus } from './components/MultiplayerMenus';
import { Lobby } from './components/Lobby';
import { MultiplayerGame } from './components/MultiplayerGame';
import { SettingsPanel } from './components/SettingsPanel';
import { soundEngine } from './audio';
import { GameSettings, MultiplayerConfig, MultiplayerRoom, Player } from './types';
import { MOCK_BOT_NAMES } from './constants';

export default function App() {
  const [screen, setScreen] = useState<'LANDING' | 'SINGLE' | 'MULTI_MENU' | 'LOBBY' | 'MULTI_GAME'>('LANDING');
  const [nickname, setNickname] = useState('');
  const [settings, setSettings] = useState<GameSettings>({ volume: 0.5, speed: 'NORMAL', storyMode: false });
  const [showSettings, setShowSettings] = useState(false);

  // Multiplayer State (Mock)
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [mpError, setMpError] = useState<string>('');

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

  // --- Handlers ---

  const handleStartMultiplayer = () => {
    setScreen('MULTI_MENU');
  };

  const handleCreateRoom = (config: MultiplayerConfig) => {
    const newPlayerId = 'p-' + Date.now();
    setPlayerId(newPlayerId);
    
    const hostPlayer: Player = {
        id: newPlayerId,
        nickname: nickname,
        isHost: true,
        status: 'WAITING',
        avatarId: Math.floor(Math.random() * 10)
    };

    setRoom({
        config,
        players: [hostPlayer],
        phase: 'LOBBY',
        currentTurnIndex: 0,
        losersFound: 0,
        winnersFound: 0,
        results: { losers: [], winners: [], survivors: [] }
    });
    setScreen('LOBBY');

    // Simulate bots joining
    simulateBotsJoining(config, hostPlayer.id);
  };

  const simulateBotsJoining = (config: MultiplayerConfig, hostId: string) => {
    let botsAdded = 0;
    const interval = setInterval(() => {
        setRoom(prev => {
            if (!prev || prev.players.length >= prev.config.maxPlayers) {
                clearInterval(interval);
                return prev;
            }
            const botName = MOCK_BOT_NAMES[Math.floor(Math.random() * MOCK_BOT_NAMES.length)] + '_' + Math.floor(Math.random()*99);
            const bot: Player = {
                id: `bot-${Date.now()}-${Math.random()}`,
                nickname: botName.toUpperCase(),
                isHost: false,
                status: 'WAITING',
                avatarId: Math.floor(Math.random() * 10)
            };
            return {
                ...prev,
                players: [...prev.players, bot]
            };
        });
    }, 2000);
  };

  const handleJoinRoom = (code: string, pass: string) => {
      // Mock join logic - usually would call API
      if (room && room.config.roomCode === code) {
           if (room.config.password && room.config.password !== pass) {
               setMpError("INVALID PASSWORD");
               soundEngine.playWarning();
               return;
           }
           if (room.players.length >= room.config.maxPlayers) {
               setMpError("LOBBY FULL");
               soundEngine.playWarning();
               return;
           }

           // Success Join (if room existed in local state - simplified for demo)
           // In this demo, we can only join the room we just created if we backed out, 
           // OR we simulate joining a fake room.
           // Let's simulate joining a Fake Room for the sake of the demo if none exists.
           const newPlayerId = 'p-' + Date.now();
           setPlayerId(newPlayerId);
           const me: Player = {
               id: newPlayerId,
               nickname: nickname,
               isHost: false,
               status: 'WAITING',
               avatarId: Math.floor(Math.random() * 10)
           };
           
           if (!room) {
               // Create fake room to join
               const fakeConfig = { roomCode: code, maxPlayers: 5, numLosers: 1, numWinners: 1 };
               setRoom({
                   config: fakeConfig,
                   players: [
                       { id: 'host-bot', nickname: 'HOST_BOT', isHost: true, status: 'WAITING', avatarId: 1 },
                       me
                   ],
                   phase: 'LOBBY',
                   currentTurnIndex: 0,
                   losersFound: 0,
                   winnersFound: 0,
                   results: { losers: [], winners: [], survivors: [] }
               });
               simulateBotsJoining(fakeConfig, 'host-bot');
           } else {
               setRoom(prev => prev ? ({ ...prev, players: [...prev.players, me] }) : null);
           }
           setScreen('LOBBY');
      } else {
          // If no room exists in state, assume code is wrong for this local demo
          // Or generate a fake one to let them play. Let's generate a fake one.
           const newPlayerId = 'p-' + Date.now();
           setPlayerId(newPlayerId);
           const me: Player = { id: newPlayerId, nickname, isHost: false, status: 'WAITING', avatarId: 3 };
           const fakeConfig = { roomCode: code, maxPlayers: 5, numLosers: 1, numWinners: 1 };
           setRoom({
               config: fakeConfig,
               players: [{ id: 'host', nickname: 'ADMIN', isHost: true, status: 'WAITING', avatarId: 1 }, me],
               phase: 'LOBBY',
               currentTurnIndex: 0,
               losersFound: 0,
               winnersFound: 0,
               results: { losers: [], winners: [], survivors: [] }
           });
           simulateBotsJoining(fakeConfig, 'host');
           setScreen('LOBBY');
      }
  };

  const handleStartGame = () => {
      if (!room) return;
      setRoom(prev => {
          if(!prev) return null;
          return {
              ...prev,
              phase: 'GAME_LOSER_ROUND',
              players: prev.players.map(p => ({...p, status: 'PLAYING'}))
          };
      });
      setScreen('MULTI_GAME');
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
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            error={mpError}
          />
      )}

      {screen === 'LOBBY' && room && (
          <Lobby 
            room={room}
            currentPlayerId={playerId}
            onStartGame={handleStartGame}
            onLeave={() => { setRoom(null); setScreen('LANDING'); }}
          />
      )}

      {screen === 'MULTI_GAME' && room && (
          <MultiplayerGame 
            room={room}
            currentPlayerId={playerId}
            updateRoom={setRoom}
            onExit={() => { setRoom(null); setScreen('LANDING'); }}
          />
      )}

      {/* Global Settings Modal */}
      {showSettings && (
        <SettingsPanel 
            settings={settings}
            onUpdate={(s) => { soundEngine.playClick(); setSettings(s); }}
            onClose={() => { soundEngine.playClick(); setShowSettings(false); }}
        />
      )}
    </>
  );
}
