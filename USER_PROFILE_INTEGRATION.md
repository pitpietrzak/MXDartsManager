# User Profile Feature - Integration Guide

## ✅ Completed

### Database
- Created `player-user-link.sql` migration
- Added `user_id` column to players table
- Added RLS policies
- Added helper functions: `link_player_to_user`, `get_player_by_user_id`

### Backend Functions (`supabaseStorage.ts`)
- `linkPlayerToUser(playerId, userId)` - Link player to user
- `getPlayerByUserId(userId)` - Get player for a user
- `getUserStats(playerId, month)` - Get player's monthly stats
- `getUserGameHistory(playerId, month)` - Get player's game history

### UI Components
- `PlayerClaimDialog.tsx` - Dialog for users to claim their player profile
- `MyProfile.tsx` - User profile view showing stats, today's game, and history

## 🔧 Remaining Integration Steps

### 1. Run Database Migration
```sql
-- Run this in Supabase SQL Editor:
-- File: player-user-link.sql
```

### 2. Update App.tsx

Add state variables after line 44:
```tsx
const [userPlayer, setUserPlayer] = useState<Player | null>(null);
const [userStats, setUserStats] = useState<MonthlyStats | null>(null);
const [userGameHistory, setUserGameHistory] = useState<DailyGame[]>([]);
const [showPlayerClaim, setShowPlayerClaim] = useState(false);
```

Update the View type to include 'myProfile':
```tsx
type View = 'dashboard' | 'players' | 'newGame' | 'leaderboard' | 'history' | 'myProfile';
```

### 3. Add Player Claiming Logic

In the `useEffect` that loads data, add after loading todaysGame:
```tsx
// Load user's player association if logged in
if (user?.id) {
  const player = await getPlayerByUserId(user.id);
  setUserPlayer(player);

  if (player) {
    const [playerStats, playerHistory] = await Promise.all([
      getUserStats(player.id, currentMonth),
      getUserGameHistory(player.id, currentMonth)
    ]);
    setUserStats(playerStats);
    setUserGameHistory(playerHistory);
  } else {
    setShowPlayerClaim(true);
  }
}
```

### 4. Add Player Claim Handler

```tsx
const handlePlayerClaim = async (playerId: string) => {
  if (user?.id) {
    const success = await linkPlayerToUser(playerId, user.id);
    if (success) {
      setShowPlayerClaim(false);
      await reloadData(); // Reload to get player data
    }
  }
};
```

### 5. Add MyProfile View

In the render section, add a new view case:
```tsx
{currentView === 'myProfile' && userPlayer && (
  <MyProfile
    player={userPlayer}
    stats={userStats}
    todaysGame={todaysGame}
    gameHistory={userGameHistory}
    currentMonth={currentMonth}
    onNavigateToResults={() => setCurrentView('newGame')}
  />
)}
```

### 6. Add Navigation Button

In the dashboard view, add a button to navigate to MyProfile:
```tsx
{userPlayer && (
  <button 
    onClick={() => setCurrentView('myProfile')}
    className="btn btn-primary"
  >
    👤 My Profile
  </button>
)}
```

### 7. Add Player Claim Dialog

Before the closing `</div>` of the main app:
```tsx
{showPlayerClaim && (
  <PlayerClaimDialog
    players={players}
    onClaim={handlePlayerClaim}
    onClose={() => setShowPlayerClaim(false)}
  />
)}
```

## 🎯 Next Steps

1. Run the database migration
2. Complete App.tsx integration following the steps above
3. Test the player claiming flow
4. Test the MyProfile view
5. (Optional) Add leaderboard highlighting
6. (Optional) Update PlayerManagement to show user associations
