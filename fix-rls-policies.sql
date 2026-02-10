-- Fix for missing UPDATE policy on games table
-- This policy allows game_managers and admins to update games (e.g., mark as completed)

CREATE POLICY "Game managers can update games"
  ON games FOR UPDATE
  USING (
    is_admin(auth.uid()) OR 
    get_user_role(auth.uid()) = 'game_manager'
  );

-- Also add UPDATE policies for game_results (to update placeholder results with actual results)
CREATE POLICY "Game managers can update game_results"
  ON game_results FOR UPDATE
  USING (
    is_admin(auth.uid()) OR 
    get_user_role(auth.uid()) = 'game_manager'
  );

-- Also add DELETE policy for game_results (to delete placeholder results before inserting actual ones)
CREATE POLICY "Game managers can delete game_results"
  ON game_results FOR DELETE
  USING (
    is_admin(auth.uid()) OR 
    get_user_role(auth.uid()) = 'game_manager'
  );
