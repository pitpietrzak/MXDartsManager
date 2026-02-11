-- Add new columns to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS is_playing_today BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '👽';

-- Update existing rows to have default values
UPDATE players SET is_playing_today = TRUE WHERE is_playing_today IS NULL;
UPDATE players SET emoji = '👽' WHERE emoji IS NULL;
