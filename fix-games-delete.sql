-- Allow Game Managers and Admins to DELETE games
-- This is required for the "Edit Groups" feature which deletes incomplete games to replace them.

CREATE POLICY "Game managers can delete games"
  ON games FOR DELETE
  USING (
    is_admin(auth.uid()) OR 
    get_user_role(auth.uid()) = 'game_manager'
  );
