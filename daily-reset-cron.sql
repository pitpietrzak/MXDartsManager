-- Enable the pg_cron extension if not already enabled
-- Note: You might need to enable this in the Supabase Dashboard under Database -> Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the daily reset job
-- This will run every day at 3:00 AM UTC
-- It resets 'is_playing_today' to TRUE for all players
SELECT cron.schedule(
    'reset-is-playing-today', -- Unique name for the job
    '0 3 * * *',              -- Cron schedule (3:00 AM daily)
    $$UPDATE players SET is_playing_today = TRUE WHERE is_playing_today = FALSE$$
);

-- To check if the job is scheduled, you can run:
-- SELECT * FROM cron.job;
