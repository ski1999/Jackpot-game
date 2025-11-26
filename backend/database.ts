import { MultiplayerRoom, Player } from './types';

export interface IGameDatabase {
  createRoom(room: MultiplayerRoom): Promise<void>;
  getRoom(code: string): Promise<MultiplayerRoom | null>;
  updateRoom(code: string, room: MultiplayerRoom): Promise<void>;
  deleteRoom(code: string): Promise<void>;
  
  // Helpers
  findRoomByPlayerSocket(socketId: string): Promise<MultiplayerRoom | null>;
}

// Simple In-Memory DB for MVP
export class MemoryDatabase implements IGameDatabase {
  private rooms: Map<string, MultiplayerRoom> = new Map();

  async createRoom(room: MultiplayerRoom): Promise<void> {
    this.rooms.set(room.config.roomCode, room);
  }

  async getRoom(code: string): Promise<MultiplayerRoom | null> {
    return this.rooms.get(code) || null;
  }

  async updateRoom(code: string, room: MultiplayerRoom): Promise<void> {
    this.rooms.set(code, room);
  }

  async deleteRoom(code: string): Promise<void> {
    this.rooms.delete(code);
  }

  async findRoomByPlayerSocket(socketId: string): Promise<MultiplayerRoom | null> {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.socketId === socketId)) {
        return room;
      }
    }
    return null;
  }
}

// Placeholder for Redis Database to satisfy server import
export class RedisDatabase implements IGameDatabase {
  constructor() {
    console.warn('RedisDatabase is not yet implemented. Please set USE_REDIS=false.');
  }

  async createRoom(room: MultiplayerRoom): Promise<void> {
    throw new Error('Redis not implemented');
  }

  async getRoom(code: string): Promise<MultiplayerRoom | null> {
    throw new Error('Redis not implemented');
  }

  async updateRoom(code: string, room: MultiplayerRoom): Promise<void> {
    throw new Error('Redis not implemented');
  }

  async deleteRoom(code: string): Promise<void> {
    throw new Error('Redis not implemented');
  }

  async findRoomByPlayerSocket(socketId: string): Promise<MultiplayerRoom | null> {
    throw new Error('Redis not implemented');
  }
}