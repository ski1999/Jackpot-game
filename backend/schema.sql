-- Enable UUID extension if needed for other features, though not strictly required for this table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: user_stats
-- Stores aggregate gameplay statistics for players.
-- Nickname is used as the unique identifier (Primary Key) for simplicity in this arcade style game.
CREATE TABLE IF NOT EXISTS user_stats (
    nickname VARCHAR(50) PRIMARY KEY,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    last_played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index: idx_user_stats_wins
-- Optimizes queries for "Top Players" or Leaderboards based on wins.
CREATE INDEX IF NOT EXISTS idx_user_stats_wins ON user_stats(wins DESC);