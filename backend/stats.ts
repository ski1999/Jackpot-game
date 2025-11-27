import pg from 'pg';
import { MultiplayerRoom } from './types';

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

      // Process Losers
      for (const player of room.results.losers) {
        await client.query(`
          INSERT INTO user_stats (nickname, games_played, losses, last_played_at)
          VALUES ($1, 1, 1, NOW())
          ON CONFLICT (nickname) 
          DO UPDATE SET 
            games_played = user_stats.games_played + 1,
            losses = user_stats.losses + 1,
            last_played_at = NOW();
        `, [player.nickname]);
      }

      // Process Winners
      for (const player of room.results.winners) {
        await client.query(`
          INSERT INTO user_stats (nickname, games_played, wins, last_played_at)
          VALUES ($1, 1, 1, NOW())
          ON CONFLICT (nickname) 
          DO UPDATE SET 
            games_played = user_stats.games_played + 1,
            wins = user_stats.wins + 1,
            last_played_at = NOW();
        `, [player.nickname]);
      }

      // Process Survivors (Participants who didn't win or lose specifically)
      // Note: Logic might vary if you consider everyone else a loser or just a participant.
      // Here we count them as just played.
      for (const player of room.results.survivors) {
        // Ensure we don't double count if they somehow ended up in multiple lists (unlikely)
        if (room.results.winners.find(w => w.id === player.id)) continue;
        if (room.results.losers.find(l => l.id === player.id)) continue;

        await client.query(`
          INSERT INTO user_stats (nickname, games_played, last_played_at)
          VALUES ($1, 1, NOW())
          ON CONFLICT (nickname) 
          DO UPDATE SET 
            games_played = user_stats.games_played + 1,
            last_played_at = NOW();
        `, [player.nickname]);
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