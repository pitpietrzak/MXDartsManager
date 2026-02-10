-- Authentication and Role-Based Access Control Schema

-- ============================================
-- User Roles Table (must be created first)
-- ============================================

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL CHECK (role IN ('admin', 'game_manager', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- Helper Functions (created after table exists)
-- ============================================

-- Function to check if user is admin (bypasses RLS)
-- SECURITY DEFINER allows this function to bypass RLS
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid AND role = 'admin'
  );
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read all roles (simplified to avoid recursion)
-- This is safe because we control writes with the policies below
CREATE POLICY "Anyone authenticated can read roles"
  ON user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update/delete roles (using function to avoid recursion)
-- Special case: allow insert during user creation (when auth.uid() is null but user_id matches)
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR 
    auth.uid() IS NULL  -- Allow trigger to insert during signup
  );

CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- Update RLS Policies for Existing Tables
-- ============================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Players: only admins can modify, everyone authenticated can read
CREATE POLICY "Authenticated users can read players"
  ON players FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage players"
  ON players FOR ALL
  USING (is_admin(auth.uid()));

-- Games: game_managers and admins can create, everyone authenticated can read
CREATE POLICY "Authenticated users can read games"
  ON games FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Game managers can create games"
  ON games FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR 
    get_user_role(auth.uid()) = 'game_manager'
  );

CREATE POLICY "Admins can delete games"
  ON games FOR DELETE
  USING (is_admin(auth.uid()));

-- Game groups: game_managers and admins can create, everyone authenticated can read
CREATE POLICY "Authenticated users can read game_groups"
  ON game_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Game managers can create game_groups"
  ON game_groups FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR 
    get_user_role(auth.uid()) = 'game_manager'
  );

-- Game results: game_managers and admins can create, everyone authenticated can read
CREATE POLICY "Authenticated users can read game_results"
  ON game_results FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Game managers can create game_results"
  ON game_results FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR 
    get_user_role(auth.uid()) = 'game_manager'
  );

-- ============================================
-- Trigger to auto-assign 'user' role on signup
-- ============================================

-- This function bypasses RLS to insert the initial user role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create user_role for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Notes for Setup
-- ============================================

-- After running this schema:
-- 1. The first user to sign up will get 'user' role automatically
-- 2. Manually update the first user to 'admin' role:
--    UPDATE user_roles SET role = 'admin' WHERE user_id = '<first-user-id>';
-- 3. Then that admin can assign roles to other users through the UI

-- Security Note:
-- All authenticated users can READ roles, but only admins can WRITE.
-- This is acceptable because role information is not sensitive,
-- and it allows the RoleManager component to work without recursion issues.
