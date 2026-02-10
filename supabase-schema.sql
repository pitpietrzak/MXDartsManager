-- Macrix Dart Competition Database Schema
-- Run this in your Supabase SQL Editor

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  month TEXT NOT NULL, -- Format: "YYYY-MM"
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game groups table (each game can have multiple groups)
CREATE TABLE game_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  group_index INTEGER NOT NULL
);

-- Game results table (individual player results per group)
CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES game_groups(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  position INTEGER NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_games_date ON games(date);
CREATE INDEX idx_games_month ON games(month);
CREATE INDEX idx_game_groups_game_id ON game_groups(game_id);
CREATE INDEX idx_game_results_group_id ON game_results(group_id);
CREATE INDEX idx_game_results_player_id ON game_results(player_id);

-- Note: RLS is enabled but policies are defined in auth-schema.sql
-- Run auth-schema.sql after this file to set up authentication and role-based policies

-- Function to calculate monthly stats
CREATE OR REPLACE FUNCTION get_monthly_stats(target_month TEXT)
RETURNS TABLE (
  player_id UUID,
  player_name TEXT,
  games_played BIGINT,
  days_played BIGINT,
  total_wins BIGINT,
  total_losses BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as player_id,
    p.name as player_name,
    COUNT(DISTINCT g.id) as games_played,
    COUNT(DISTINCT g.date) as days_played,
    COALESCE(SUM(gr.wins), 0) as total_wins,
    COALESCE(SUM(gr.losses), 0) as total_losses
  FROM players p
  LEFT JOIN game_results gr ON p.id = gr.player_id
  LEFT JOIN game_groups gg ON gr.group_id = gg.id
  LEFT JOIN games g ON gg.game_id = g.id AND g.month = target_month
  WHERE EXISTS (
    SELECT 1 FROM game_results gr2
    JOIN game_groups gg2 ON gr2.group_id = gg2.id
    JOIN games g2 ON gg2.game_id = g2.id
    WHERE gr2.player_id = p.id AND g2.month = target_month
  )
  GROUP BY p.id, p.name;
END;
$$ LANGUAGE plpgsql;
