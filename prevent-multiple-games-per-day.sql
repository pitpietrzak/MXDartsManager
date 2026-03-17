-- Migration: Prevent multiple games per player on the same day
-- Enforces that a player can only have one entry in game_results for any given date.

-- Function to check for existing player result on the same date
CREATE OR REPLACE FUNCTION check_player_one_game_per_day()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
BEGIN
    -- 1. Identify the date of the game associated with the NEW result
    SELECT g.date INTO target_date
    FROM games g
    JOIN game_groups gg ON gg.game_id = g.id
    WHERE gg.id = NEW.group_id;

    -- 2. Check if the player already has a result on THIS specific date
    IF EXISTS (
        SELECT 1 
        FROM game_results gr
        JOIN game_groups gg ON gr.group_id = gg.id
        JOIN games g ON gg.game_id = g.id
        WHERE gr.player_id = NEW.player_id
        AND g.date = target_date
        AND gr.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Player has already participated in a game on %', target_date USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the check before insert or update on game_results
DROP TRIGGER IF EXISTS trigger_check_player_one_game_per_day ON game_results;
CREATE TRIGGER trigger_check_player_one_game_per_day
BEFORE INSERT OR UPDATE ON game_results
FOR EACH ROW EXECUTE FUNCTION check_player_one_game_per_day();

-- Comment for clarity
COMMENT ON FUNCTION check_player_one_game_per_day IS 'Prevents players from participating in more than one game per calendar day.';
