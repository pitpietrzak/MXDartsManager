-- Allow anonymous read access to game data for the public results page

-- Enable public read for players
CREATE POLICY "Anyone can read players"
  ON players FOR SELECT
  USING (true);

-- Enable public read for games
CREATE POLICY "Anyone can read games"
  ON games FOR SELECT
  USING (true);

-- Enable public read for game_groups
CREATE POLICY "Anyone can read game_groups"
  ON game_groups FOR SELECT
  USING (true);

-- Enable public read for game_results
CREATE POLICY "Anyone can read game_results"
  ON game_results FOR SELECT
  USING (true);

-- Note: These policies coexist with existing authenticated/admin policies.
-- In Supabase, if ANY policy allows access, then access is granted.
