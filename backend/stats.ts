

import pg from 'pg';
import { MultiplayerRoom, Player, PlayerStats } from './types';

const { Pool } = pg;

export class StatsDatabase {
  private pool: pg.Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async recordGameStats(room: MultiplayerRoom) {
    if (room.statsRecorded) return;
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Helper to upsert stats
      const upsertStats = async (player: Player, win: boolean, loss: boolean) => {
          if (!player.userId) return; 

          await client.query(`
            INSERT INTO user_stats (user_id, nickname, games_played, wins, losses, last_played_at)
            VALUES ($1, $2, 1, $3, $4, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
              nickname = $2,
              games_played = user_stats.games_played + 1,
              wins = user_stats.wins + $3,
              losses = user_stats.losses + $4,
              last_played_at = NOW();
          `, [player.userId, player.nickname, win ? 1 : 0, loss ? 1 : 0]);
      };

      for (const player of room.results.losers) {
          await upsertStats(player, false, true);
      }

      for (const player of room.results.winners) {
          await upsertStats(player, true, false);
      }

      for (const player of room.results.survivors) {
          if (room.results.winners.some(w => w.id === player.id)) continue;
          if (room.results.losers.some(l => l.id === player.id)) continue;
          
          await upsertStats(player, false, false);
      }

      await client.query('COMMIT');
      room.statsRecorded = true;
      console.log(`Stats recorded for Room ${room.config.roomCode}`);

    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Failed to record stats', e);
    } finally {
      client.release();
    }
  }

  async updateHighScore(userId: string, nickname: string, score: number, stagesCleared: number = 0) {
      const client = await this.pool.connect();
      try {
          // Only update if new score is higher
          // We use ON CONFLICT to insert if new user, or update if exists
          // We also increment 'wins' by the number of stages cleared (as per request)
          await client.query(`
            INSERT INTO user_stats (user_id, nickname, high_score, wins, games_played, last_played_at)
            VALUES ($1, $2, $3, $4, 1, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
              nickname = $2,
              high_score = GREATEST(user_stats.high_score, $3),
              wins = user_stats.wins + $4,
              games_played = user_stats.games_played + 1,
              last_played_at = NOW();
          `, [userId, nickname, score, stagesCleared]);
          console.log(`Updated Stats for ${nickname}: Score ${score}, Stages +${stagesCleared}`);
      } catch (e) {
          console.error('Failed to update high score', e);
      } finally {
          client.release();
      }
  }

  async getLeaderboard(): Promise<PlayerStats[]> {
      const client = await this.pool.connect();
      try {
          const res = await client.query(`
            SELECT nickname, wins, losses, games_played, high_score
            FROM user_stats
            ORDER BY high_score DESC, wins DESC
            LIMIT 10
          `);
          return res.rows;
      } catch (e) {
          console.error('Failed to get leaderboard', e);
          return [];
      } finally {
          client.release();
      }
  }

  // --- Archiver Methods ---

  async getAllStats(): Promise<any[]> {
      const client = await this.pool.connect();
      try {
          const res = await client.query('SELECT * FROM user_stats');
          return res.rows;
      } finally {
          client.release();
      }
  }

  async resetStats() {
      const client = await this.pool.connect();
      try {
          await client.query('TRUNCATE TABLE user_stats');
          console.log("Database Reset Complete.");
      } finally {
          client.release();
      }
  }
}