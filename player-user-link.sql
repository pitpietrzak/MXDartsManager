-- Player-User Association Migration
-- This adds the ability to link players to authenticated users

-- Add user_id column to players table
ALTER TABLE players 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add unique constraint to ensure one user can only be linked to one player
ALTER TABLE players 
ADD CONSTRAINT players_user_id_unique UNIQUE (user_id);

-- Create index for faster lookups
CREATE INDEX idx_players_user_id ON players(user_id);

-- Add RLS policy to allow users to update their own player profile
CREATE POLICY "Users can update their own player profile"
  ON players FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add function to link player to user (admin/game_manager only)
CREATE OR REPLACE FUNCTION link_player_to_user(
  player_uuid UUID,
  user_uuid UUID DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin (only admins can link players to users)
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can link players to users';
  END IF;

  -- Update player with user_id (NULL to unlink)
  UPDATE players
  SET user_id = user_uuid
  WHERE id = player_uuid;

  RETURN FOUND;
END;
$$;

-- Add function to get player by user_id
CREATE OR REPLACE FUNCTION get_player_by_user_id(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, name, user_id, created_at
  FROM players
  WHERE user_id = user_uuid;
$$;

-- Comments
COMMENT ON COLUMN players.user_id IS 'Links player to authenticated user account';
COMMENT ON FUNCTION link_player_to_user IS 'Admin/game_manager function to associate a player with a user';
COMMENT ON FUNCTION get_player_by_user_id IS 'Get player record associated with a user ID';
