
import pg from 'pg';
import { MultiplayerRoom, Player } from './types';

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
      // Uses user_id as key, but updates nickname to the latest one used
      const upsertStats = async (player: Player, win: boolean, loss: boolean) => {
          if (!player.userId) return; // Skip if no persistent ID (shouldn't happen in prod)

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
          // Double check they aren't already processed
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
}
