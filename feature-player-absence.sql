
-- Player Absence Feature Migration

-- Create table for tracking player absences
CREATE TABLE player_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  absence_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a player can only have one absence record per date
  UNIQUE(player_id, absence_date)
);

-- Index for faster lookups
CREATE INDEX idx_player_absences_player_date ON player_absences(player_id, absence_date);
CREATE INDEX idx_player_absences_date ON player_absences(absence_date);

-- Enable RLS
ALTER TABLE player_absences ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Everyone can view absences (needed for scheduling games)
CREATE POLICY "Everyone can view absences"
  ON player_absences FOR SELECT
  USING (true);

-- 2. Users can insert their own absences
CREATE POLICY "Users can insert their own absences"
  ON player_absences FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM players WHERE id = player_absences.player_id
    )
  );

-- 3. Users can delete their own absences
CREATE POLICY "Users can delete their own absences"
  ON player_absences FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM players WHERE id = player_absences.player_id
    )
  );

-- 4. Admins/Game Managers can manage all absences (optional, good for support)
-- Assuming is_admin() or is_game_manager() functions exist as per other modules
CREATE POLICY "Admins can manage all absences"
  ON player_absences FOR ALL
  USING (
    (SELECT is_admin(auth.uid())) OR (SELECT is_game_manager(auth.uid()))
  );

-- Function to get absences for a specific player and month
CREATE OR REPLACE FUNCTION get_player_absences(
  target_player_id UUID,
  month_start DATE,
  month_end DATE
)
RETURNS TABLE (
  absence_date DATE
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT absence_date
  FROM player_absences
  WHERE player_id = target_player_id
  AND absence_date >= month_start
  AND absence_date <= month_end;
$$;
