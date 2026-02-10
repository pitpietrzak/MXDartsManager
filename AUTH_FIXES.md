# Authentication Fixes - Critical Updates

## Issues Fixed

### 1. ✅ Infinite Recursion in RLS Policy
**Problem:** The "Admins can manage roles" policy was checking the `user_roles` table while being applied to the same table, causing infinite recursion.

**Solution:** Split the policy into separate policies:
- `Users can read own role` - Users can see their own role
- `Admins can read all roles` - Admins can see all roles
- `Admins can insert/update/delete roles` - Uses `is_admin()` function to avoid recursion

### 2. ✅ Missing API Key Error
**Problem:** `RoleManager` was trying to use `supabase.auth.admin.getUserById()` which requires a service role key (not available in client-side code).

**Solution:** 
- Added `email` column to `user_roles` table
- Modified `handle_new_user()` trigger to store email when user signs up
- Updated `RoleManager` to read emails directly from `user_roles` table

## What Changed

### auth-schema.sql
1. Added `email text` column to `user_roles` table
2. Split RLS policies to avoid recursion
3. Changed `is_admin()` function to use SQL instead of PL/pgSQL (bypasses RLS)
4. Updated `handle_new_user()` trigger to store email

### RoleManager.tsx
1. Removed `supabase.auth.admin.getUserById()` calls
2. Now reads email from `user_roles` table directly
3. Simplified user loading logic

## How to Apply Fixes

### If you already ran auth-schema.sql:

You need to drop and recreate the policies. Run this in Supabase SQL Editor:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Add email column if not exists
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS email text;

-- Drop and recreate the is_admin function
DROP FUNCTION IF EXISTS is_admin(uuid);
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

-- Create new split policies
CREATE POLICY "Admins can read all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  USING (is_admin(auth.uid()));

-- Update trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_roles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### If you haven't run auth-schema.sql yet:

Just run the updated `auth-schema.sql` file - it now has all the fixes.

## Testing

After applying fixes:
1. Refresh your app
2. Try to sign up - should work without errors
3. Check browser console - no more "infinite recursion" errors
4. Sign in as admin
5. Go to Players → Role Management
6. You should see users with their emails

## Why These Fixes Work

**Recursion Fix:** By using the `is_admin()` function (which is marked `SECURITY DEFINER`), we bypass RLS when checking if a user is admin. This breaks the recursion cycle.

**API Key Fix:** Instead of trying to call admin APIs from the client (which requires service role key), we store the email in the `user_roles` table where it's accessible via normal RLS policies.
