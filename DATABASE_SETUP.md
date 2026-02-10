# Database Setup Order

## Important: Run schemas in this order!

### 1. First: supabase-schema.sql
This creates the base tables for the application:
- `players`
- `games`
- `game_groups`
- `game_results`
- Helper function `get_monthly_stats()`

### 2. Second: auth-schema.sql
This adds authentication and role-based access control:
- `user_roles` table
- RLS policies for all tables
- Helper functions for role management
- Auto-assign trigger for new users

## Why this order matters

The `auth-schema.sql` file references the tables created in `supabase-schema.sql`, so you must run `supabase-schema.sql` first.

## Quick Setup

```sql
-- Step 1: Run in Supabase SQL Editor
-- Copy and paste supabase-schema.sql

-- Step 2: Run in Supabase SQL Editor  
-- Copy and paste auth-schema.sql

-- Step 3: Create your first admin user
-- Sign up through the app, then run:
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1
);
```
