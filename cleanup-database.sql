-- ============================================
-- CLEANUP SCRIPT - DROP ALL DATABASE OBJECTS
-- ============================================
-- WARNING: This will delete ALL data and tables!
-- Use this to start fresh with a clean database.
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_monthly_stats(text) CASCADE;

-- Drop policies (must be done before dropping tables)
-- User roles policies
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Players policies
DROP POLICY IF EXISTS "Authenticated users can read players" ON players;
DROP POLICY IF EXISTS "Admins can manage players" ON players;
DROP POLICY IF EXISTS "Allow all operations on players" ON players;

-- Games policies
DROP POLICY IF EXISTS "Authenticated users can read games" ON games;
DROP POLICY IF EXISTS "Game managers can create games" ON games;
DROP POLICY IF EXISTS "Allow all operations on games" ON games;

-- Game groups policies
DROP POLICY IF EXISTS "Authenticated users can read game_groups" ON game_groups;
DROP POLICY IF EXISTS "Game managers can create game_groups" ON game_groups;
DROP POLICY IF EXISTS "Allow all operations on game_groups" ON game_groups;

-- Game results policies
DROP POLICY IF EXISTS "Authenticated users can read game_results" ON game_results;
DROP POLICY IF EXISTS "Game managers can create game_results" ON game_results;
DROP POLICY IF EXISTS "Allow all operations on game_results" ON game_results;

-- Drop indexes
DROP INDEX IF EXISTS idx_games_date;
DROP INDEX IF EXISTS idx_games_month;
DROP INDEX IF EXISTS idx_game_groups_game_id;
DROP INDEX IF EXISTS idx_game_results_group_id;
DROP INDEX IF EXISTS idx_game_results_player_id;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS game_results CASCADE;
DROP TABLE IF EXISTS game_groups CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, you can verify everything is gone by running:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- 
-- You should see no tables related to the dart competition app.
-- ============================================

-- ============================================
-- NEXT STEPS
-- ============================================
-- After cleanup, run these scripts in order:
-- 1. supabase-schema.sql
-- 2. auth-schema.sql
-- 3. Sign up and manually set first user to admin
-- ============================================
