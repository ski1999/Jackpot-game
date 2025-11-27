-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: user_stats
-- Stores aggregate gameplay statistics for players.
-- user_id (UUID) is the primary key to allow nickname changes and anonymity.
CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY,
    nickname VARCHAR(50),
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    last_played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index: idx_user_stats_wins
-- Optimizes queries for "Top Players" or Leaderboards based on wins.
CREATE INDEX IF NOT EXISTS idx_user_stats_wins ON user_stats(wins DESC);

-- 1. Add the high_score column for Single Player tracking
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS high_score INTEGER DEFAULT 0;

-- 2. Create an index to make the Leaderboard query fast
CREATE INDEX IF NOT EXISTS idx_user_stats_high_score ON user_stats(high_score DESC);