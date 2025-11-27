
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { MemoryDatabase, RedisDatabase } from './database';
import { GameLogic } from './gameLogic';
import { Player, MultiplayerConfig } from './types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StatsDatabase } from './stats';
import { TelemetryService } from './telemetry';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const USE_REDIS = process.env.USE_REDIS === 'true';
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

const server = createServer((req, res) => {
  const distPath = path.join(__dirname, '../dist');
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
const telemetry = new TelemetryService();

console.log(`Faz-Slots Backend running on port ${PORT} (Redis: ${USE_REDIS}, Postgres: ${USE_POSTGRES})`);

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
  let persistentUserId: string | null = null;

  console.log(`New client: ${socketId}`);

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case 'AUTH':
          currentNickname = payload.nickname;
          currentPlayerId = socketId;
          
          if (payload.token) {
              persistentUserId = payload.token;
              console.log(`User returned with ID: ${persistentUserId}`);
          } else {
              persistentUserId = randomUUID();
              console.log(`New user assigned ID: ${persistentUserId}`);
          }

          ws.send(JSON.stringify({ 
              type: 'IDENTITY', 
              id: currentPlayerId,
              userId: persistentUserId 
          }));
          break;

        case 'CREATE_ROOM':
          const config = payload as MultiplayerConfig;
          const host: Player = {
             id: currentPlayerId!,
             userId: persistentUserId!,
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
             currentProb: 0,
             isProcessing: false
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
             userId: persistentUserId!,
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
             
             // Guard: Block if action already in progress
             if (room.isProcessing) return;

             const player = room.players[room.currentTurnIndex];
             // Guard: Block if player is eliminated or winner
             if (player.status === 'ELIMINATED' || player.status === 'WINNER') return;

             room.isProcessing = true; // LOCK
             room.lastActionMessage = `${player.nickname} IS SPINNING...`;
             
             // Broadcast 'SPINNING' state first
             await db.updateRoom(room.config.roomCode, room);
             broadcastRoomUpdate(room.config.roomCode);
             
             const reactionTime = room.turnStartTime ? Date.now() - room.turnStartTime : 0;
             
             // Wait for animation (2s)
             setTimeout(async () => {
                 const r = await db.getRoom(room.config.roomCode);
                 if (!r) return;
                 
                 const result = GameLogic.handleSpin(r);
                 r.turnResult = { hit: result.hit };
                 
                 telemetry.recordEvent({
                     timestamp: new Date().toISOString(),
                     roomId: r.config.roomCode,
                     playerId: player.userId || player.id, 
                     nickname: player.nickname,
                     roundPhase: r.phase,
                     action: 'SPIN',
                     reactionTimeMs: reactionTime,
                     outcome: result.hit ? 'HIT' : 'SAFE'
                 });

                 // Broadcast Result
                 await db.updateRoom(r.config.roomCode, r);
                 broadcastRoomUpdate(r.config.roomCode);

                 // Wait for Result Display (3s)
                 setTimeout(async () => {
                     const r2 = await db.getRoom(r.config.roomCode);
                     if (r2) {
                         console.log(`Processing Turn End. Hit: ${result.hit}`);
                         GameLogic.processTurnResult(r2, result.hit);
                         
                         // Debug Logs
                         console.log("Losers:", r2.results.losers.map(l => l.nickname));
                         console.log("Winners:", r2.results.winners.map(w => w.nickname));

                         r2.turnResult = undefined;
                         r2.isProcessing = false; // UNLOCK
                         
                         if (r2.phase === 'RESULTS' && statsDb && !r2.statsRecorded) {
                            statsDb.recordGameStats(r2);
                         }

                         await db.updateRoom(r2.config.roomCode, r2);
                         broadcastRoomUpdate(r2.config.roomCode);
                     }
                 }, 3000);
             }, 2000);
          }
          break;

        case 'ACTION_CUT_WIRE':
          {
             const room = await db.findRoomByPlayerSocket(socketId);
             if (!room || room.players[room.currentTurnIndex].socketId !== socketId) return;

             // Guard: Block if action already in progress
             if (room.isProcessing) return;

             const player = room.players[room.currentTurnIndex];
             // Guard: Block if player is eliminated or winner
             if (player.status === 'ELIMINATED' || player.status === 'WINNER') return;

             room.isProcessing = true; // LOCK
             const reactionTime = room.turnStartTime ? Date.now() - room.turnStartTime : 0;
             
             const result = GameLogic.handleWireCut(room, payload.wireId);
             if (result) {
                 room.lastActionMessage = "CUTTING WIRE...";

                 telemetry.recordEvent({
                     timestamp: new Date().toISOString(),
                     roomId: room.config.roomCode,
                     playerId: player.userId || player.id,
                     nickname: player.nickname,
                     roundPhase: room.phase,
                     action: 'CUT_WIRE',
                     targetId: payload.wireId.toString(),
                     reactionTimeMs: reactionTime,
                     outcome: result.hit ? 'HIT' : 'ODDS_CHANGE'
                 });
                 
                 if (result.hit) {
                     room.turnResult = { hit: true };
                     await db.updateRoom(room.config.roomCode, room);
                     broadcastRoomUpdate(room.config.roomCode);

                     setTimeout(async () => {
                         const r = await db.getRoom(room.config.roomCode);
                         if (r) {
                             GameLogic.processTurnResult(r, true);
                             r.turnResult = undefined;
                             r.isProcessing = false; // UNLOCK

                             if (r.phase === 'RESULTS' && statsDb && !r.statsRecorded) {
                                statsDb.recordGameStats(r);
                             }

                             await db.updateRoom(r.config.roomCode, r);
                             broadcastRoomUpdate(r.config.roomCode);
                         }
                     }, 3000);

                 } else {
                     // SAFE CUT: Advance turn after short delay
                     room.lastActionMessage = "WIRE BYPASSED. SAFE.";
                     await db.updateRoom(room.config.roomCode, room);
                     broadcastRoomUpdate(room.config.roomCode);

                     setTimeout(async () => {
                        const r = await db.getRoom(room.config.roomCode);
                        if (r) {
                            // Turn ends, proceed to next player (outcome = false means no elimination/win yet)
                            GameLogic.processTurnResult(r, false);
                            r.isProcessing = false; // UNLOCK
                            await db.updateRoom(r.config.roomCode, r);
                            broadcastRoomUpdate(r.config.roomCode);
                        }
                     }, 2000); // 2 second delay to show "SAFE"
                 }
             } else {
                 room.isProcessing = false; // Release lock if invalid move
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
