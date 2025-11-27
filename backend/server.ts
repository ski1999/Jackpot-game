import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { MemoryDatabase, RedisDatabase } from './database';
import { GameLogic } from './gameLogic';
import { Player, MultiplayerConfig } from './types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StatsDatabase } from './stats';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const USE_REDIS = process.env.USE_REDIS === 'true';
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

// 1. Create HTTP Server (Serves Frontend + Upgrades WS)
const server = createServer((req, res) => {
  // Serve static files from dist/ directory (Built React App)
  // In Docker, we copy dist to the root /app/dist, and this script runs from /app/backend
  // So ../dist is correct.
  const distPath = path.join(__dirname, '../dist');
  
  // Sanitize path (basic)
  const safePath = path.normalize(req.url || '/').replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(distPath, safePath === '/' ? 'index.html' : safePath);

  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
      case '.js': contentType = 'text/javascript'; break;
      case '.css': contentType = 'text/css'; break;
      case '.json': contentType = 'application/json'; break;
      case '.png': contentType = 'image/png'; break;
      case '.jpg': contentType = 'image/jpg'; break;
      case '.svg': contentType = 'image/svg+xml'; break;
  }

  fs.readFile(filePath, (error, content) => {
      if (error) {
          if (error.code === 'ENOENT') {
              // SPA Fallback: If file not found (e.g. /game), serve index.html
              fs.readFile(path.join(distPath, 'index.html'), (err, fallbackContent) => {
                  if (err) {
                      res.writeHead(500);
                      res.end('Error loading client');
                  } else {
                      res.writeHead(200, { 'Content-Type': 'text/html' });
                      res.end(fallbackContent, 'utf-8');
                  }
              });
          } else {
              res.writeHead(500);
              res.end(`Server Error: ${error.code}`);
          }
      } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
      }
  });
});

const wss = new WebSocketServer({ server });
const db = USE_REDIS ? new RedisDatabase() : new MemoryDatabase();
const statsDb = USE_POSTGRES ? new StatsDatabase() : null;

console.log(`Faz-Slots Backend running on port ${PORT} (Redis: ${USE_REDIS}, Postgres: ${USE_POSTGRES})`);

// Helper to broadcast room state to all players in that room
const broadcastRoomUpdate = async (roomCode: string) => {
  const room = await db.getRoom(roomCode);
  if (!room) return;

  const payload = JSON.stringify({ type: 'ROOM_UPDATE', payload: room });
  
  room.players.forEach(p => {
    if (p.socketId) {
       for (const client of wss.clients) {
           if ((client as any).id === p.socketId && client.readyState === WebSocket.OPEN) {
               client.send(payload);
           }
       }
    }
  });
};

wss.on('connection', (ws: WebSocket) => {
  const socketId = Math.random().toString(36).substring(7);
  (ws as any).id = socketId;
  let currentPlayerId: string | null = null;
  let currentNickname: string = 'Anonymous';

  console.log(`New client: ${socketId}`);

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case 'AUTH':
          currentNickname = payload.nickname;
          currentPlayerId = socketId;
          ws.send(JSON.stringify({ type: 'IDENTITY', id: currentPlayerId }));
          break;

        case 'CREATE_ROOM':
          const config = payload as MultiplayerConfig;
          const host: Player = {
             id: currentPlayerId!,
             nickname: currentNickname,
             isHost: true,
             status: 'WAITING',
             avatarId: Math.floor(Math.random() * 6),
             socketId
          };
          const newRoom = {
             config,
             players: [host],
             phase: 'LOBBY' as const,
             currentTurnIndex: 0,
             losersFound: 0,
             winnersFound: 0,
             results: { losers: [], winners: [], survivors: [] },
             currentWires: [],
             currentProb: 0
          };
          await db.createRoom(newRoom);
          broadcastRoomUpdate(config.roomCode);
          break;

        case 'JOIN_ROOM':
          const { code, password } = payload;
          const room = await db.getRoom(code);
          if (!room) {
             ws.send(JSON.stringify({ type: 'ERROR', message: 'ROOM NOT FOUND' }));
             return;
          }
          if (room.config.password && room.config.password !== password) {
             ws.send(JSON.stringify({ type: 'ERROR', message: 'WRONG PASSWORD' }));
             return;
          }
          if (room.players.length >= room.config.maxPlayers) {
             ws.send(JSON.stringify({ type: 'ERROR', message: 'ROOM FULL' }));
             return;
          }
          
          const newPlayer: Player = {
             id: currentPlayerId!,
             nickname: currentNickname,
             isHost: false,
             status: 'WAITING',
             avatarId: Math.floor(Math.random() * 6),
             socketId
          };
          room.players.push(newPlayer);
          await db.updateRoom(code, room);
          broadcastRoomUpdate(code);
          break;

        case 'START_GAME':
          {
             const room = await db.findRoomByPlayerSocket(socketId);
             if (room && room.players.find(p => p.socketId === socketId)?.isHost) {
                 GameLogic.startGame(room);
                 await db.updateRoom(room.config.roomCode, room);
                 broadcastRoomUpdate(room.config.roomCode);
             }
          }
          break;
        
        case 'ACTION_SPIN':
          {
             const room = await db.findRoomByPlayerSocket(socketId);
             if (!room || room.players[room.currentTurnIndex].socketId !== socketId) return;
             
             const result = GameLogic.handleSpin(room);
             room.turnResult = { hit: result.hit };
             
             await db.updateRoom(room.config.roomCode, room);
             broadcastRoomUpdate(room.config.roomCode);

             setTimeout(async () => {
                 const r = await db.getRoom(room.config.roomCode);
                 if (r) {
                     GameLogic.processTurnResult(r, result.hit);
                     r.turnResult = undefined;
                     
                     if (r.phase === 'RESULTS' && statsDb && !r.statsRecorded) {
                        statsDb.recordGameStats(r);
                     }

                     await db.updateRoom(r.config.roomCode, r);
                     broadcastRoomUpdate(r.config.roomCode);
                 }
             }, 3000);
          }
          break;

        case 'ACTION_CUT_WIRE':
          {
             const room = await db.findRoomByPlayerSocket(socketId);
             if (!room || room.players[room.currentTurnIndex].socketId !== socketId) return;
             
             const result = GameLogic.handleWireCut(room, payload.wireId);
             if (result) {
                 room.lastActionMessage = "CUTTING WIRE...";
                 
                 if (result.hit) {
                     // Boom
                     room.turnResult = { hit: true };
                     await db.updateRoom(room.config.roomCode, room);
                     broadcastRoomUpdate(room.config.roomCode);

                     setTimeout(async () => {
                         const r = await db.getRoom(room.config.roomCode);
                         if (r) {
                             GameLogic.processTurnResult(r, true);
                             r.turnResult = undefined;

                             if (r.phase === 'RESULTS' && statsDb && !r.statsRecorded) {
                                statsDb.recordGameStats(r);
                             }

                             await db.updateRoom(r.config.roomCode, r);
                             broadcastRoomUpdate(r.config.roomCode);
                         }
                     }, 3000);

                 } else {
                     // Safe
                     await db.updateRoom(room.config.roomCode, room);
                     broadcastRoomUpdate(room.config.roomCode);
                 }
             }
          }
          break;
          
        case 'LEAVE_ROOM':
           {
              const room = await db.findRoomByPlayerSocket(socketId);
              if (room) {
                  room.players = room.players.filter(p => p.socketId !== socketId);
                  if (room.players.length === 0) {
                      await db.deleteRoom(room.config.roomCode);
                  } else {
                      if (!room.players.some(p => p.isHost)) {
                          room.players[0].isHost = true;
                      }
                      await db.updateRoom(room.config.roomCode, room);
                      broadcastRoomUpdate(room.config.roomCode);
                  }
              }
           }
           break;
      }

    } catch (e) {
      console.error("Invalid message", e);
    }
  });

  ws.on('close', async () => {
      console.log(`Client disconnected: ${socketId}`);
      const room = await db.findRoomByPlayerSocket(socketId);
      if (room) {
          room.players = room.players.filter(p => p.socketId !== socketId);
          if (room.players.length === 0) {
              await db.deleteRoom(room.config.roomCode);
          } else {
               if (!room.players.some(p => p.isHost)) {
                    room.players[0].isHost = true;
               }
              await db.updateRoom(room.config.roomCode, room);
              broadcastRoomUpdate(room.config.roomCode);
          }
      }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});