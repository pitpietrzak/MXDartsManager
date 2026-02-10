import { useState, useEffect } from 'react';
import { Player, Group, DailyGame, MonthlyStats } from './types/types';
import { PlayerManagement } from './components/PlayerManagement';
import { AttendanceSelector } from './components/AttendanceSelector';
import { GroupDrawer } from './components/GroupDrawer';
import { ResultsEntry } from './components/ResultsEntry';
import { Leaderboard } from './components/Leaderboard';
import { GameHistory } from './components/GameHistory';
import { Login } from './components/Login';
import { UserMenu } from './components/UserMenu';
import { RoleManager } from './components/RoleManager';
import { TodaysGames } from './components/TodaysGames';
import { ManualGroupCreator } from './components/ManualGroupCreator';
import { PlayerClaimDialog } from './components/PlayerClaimDialog';
import { MyProfile } from './components/MyProfile';
import { useAuth } from './contexts/AuthContext';
import {
  loadPlayers,
  addPlayer as dbAddPlayer,
  removePlayer as dbRemovePlayer,
  loadMonthGames,
  saveGame as dbSaveGame,
  saveIncompleteGame as dbSaveIncompleteGame,
  calculateMonthlyStats as dbCalculateMonthlyStats,
  deleteGame as dbDeleteGame,
  getTodaysGame,
  getCurrentMonth,
  getPlayerByUserId,
  linkPlayerToUser,
  getUserStats,
  getUserGameHistory
} from './utils/supabaseStorage';
import { calculateMonthlyRatings } from './utils/ratingCalculator';
import './index.css';


type View = 'dashboard' | 'players' | 'newGame' | 'leaderboard' | 'history' | 'myProfile';

function App() {
  const { user, role, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<DailyGame[]>([]);
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [todaysGame, setTodaysGame] = useState<DailyGame | null>(null);
  const [userPlayer, setUserPlayer] = useState<Player | null>(null);
  const [userStats, setUserStats] = useState<MonthlyStats | null>(null);
  const [userGameHistory, setUserGameHistory] = useState<DailyGame[]>([]);
  const [showPlayerClaim, setShowPlayerClaim] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [drawnGroups, setDrawnGroups] = useState<Group[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [manualEntry, setManualEntry] = useState(false);

  const currentMonth = getCurrentMonth();

  // Helper function to check if a date is a weekend
  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };


  // Load initial data from Supabase
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [loadedPlayers, loadedGames, loadedStats, loadedTodaysGame] = await Promise.all([
          loadPlayers(),
          loadMonthGames(currentMonth),
          dbCalculateMonthlyStats(currentMonth),
          getTodaysGame()
        ]);

        setPlayers(loadedPlayers);
        setGames(loadedGames);
        setTodaysGame(loadedTodaysGame);

        // Load user's player association if logged in
        if (user?.id) {
          console.log('Loading player for user:', user.id);
          const player = await getPlayerByUserId(user.id);
          console.log('User player loaded:', player);
          setUserPlayer(player);

          if (player) {
            const [playerStats, playerHistory] = await Promise.all([
              getUserStats(player.id, currentMonth),
              getUserGameHistory(player.id, currentMonth)
            ]);
            console.log('User stats:', playerStats);
            console.log('User game history:', playerHistory);
            setUserStats(playerStats);
            setUserGameHistory(playerHistory);
          } else {
            // Show player claim dialog if user has no player linked
            console.log('No player linked, showing claim dialog');
            setShowPlayerClaim(true);
          }
        }

        // Calculate ratings for stats
        const statsWithRatings = calculateMonthlyRatings(loadedStats);
        setStats(statsWithRatings);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentMonth, user]);

  // Recalculate ratings when stats change
  useEffect(() => {
    if (stats.length > 0) {
      const updatedStats = calculateMonthlyRatings(stats);
      if (JSON.stringify(updatedStats) !== JSON.stringify(stats)) {
        setStats(updatedStats);
      }
    }
  }, [games, stats]);

  // Reload data helper
  const reloadData = async () => {
    try {
      const [loadedPlayers, loadedGames, loadedStats] = await Promise.all([
        loadPlayers(),
        loadMonthGames(currentMonth),
        dbCalculateMonthlyStats(currentMonth)
      ]);

      setPlayers(loadedPlayers);
      setGames(loadedGames);

      const statsWithRatings = calculateMonthlyRatings(loadedStats);
      setStats(statsWithRatings);
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  const handleAddPlayer = async (name: string) => {
    const newPlayer = await dbAddPlayer(name);
    if (newPlayer) {
      setPlayers(prev => [...prev, newPlayer]);
    }
  };

  const handleRemovePlayer = async (id: string) => {
    const success = await dbRemovePlayer(id);
    if (success) {
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const handlePlayerClaim = async (playerId: string) => {
    if (user?.id) {
      // Only admins can link players
      if (role !== 'admin') {
        alert('Only admins can link players to users. Please contact an admin to link your player profile.');
        return;
      }

      const success = await linkPlayerToUser(playerId, user.id);
      if (success) {
        setShowPlayerClaim(false);
        await reloadData(); // Reload to get player data
      }
    }
  };

  // Get players who have already played on the selected date
  const getPlayersWhoPlayedToday = (): Set<string> => {
    const playersOnDate = new Set<string>();

    games.forEach(game => {
      if (game.date === selectedDate) {
        game.groups.forEach(group => {
          group.results?.forEach(result => {
            playersOnDate.add(result.playerId);
          });
        });
      }
    });

    return playersOnDate;
  };

  const handleGroupsGenerated = async (groups: Group[]) => {
    setDrawnGroups(groups);

    // Save incomplete game to database so it appears in Today's Games
    const gameId = await dbSaveIncompleteGame(selectedDate, currentMonth, groups);
    if (gameId) {
      await reloadData(); // Reload to show in Today's Games
    }
  };

  const handleResultsSubmit = async (groupsWithResults: Group[]) => {
    console.log('handleResultsSubmit - Starting with groups:', groupsWithResults);
    console.log('handleResultsSubmit - Selected date:', selectedDate);

    const gameMonth = selectedDate.substring(0, 7); // Extract YYYY-MM from selected date
    const gameId = await dbSaveGame(selectedDate, gameMonth, groupsWithResults);

    console.log('handleResultsSubmit - Returned gameId:', gameId);

    if (gameId) {
      // Reload all data to get updated stats
      await reloadData();

      // Reset for next game
      setSelectedPlayerIds([]);
      setDrawnGroups([]);
      setSelectedDate(new Date().toISOString().split('T')[0]); // Reset to today
      setCurrentView('leaderboard');
    } else {
      console.error('Failed to save game');
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    const success = await dbDeleteGame(gameId);
    if (success) {
      await reloadData();
    } else {
      console.error('Failed to delete game');
      alert('Failed to delete game. Please try again.');
    }
  };

  const presentPlayers = players.filter(p => selectedPlayerIds.includes(p.id));

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
          <p className="text-muted">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  // Show loading while fetching data
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
          <p className="text-muted">Connecting to database</p>
        </div>
      </div>
    );
  }

  // Check role permissions for current view
  const canAccessView = (view: View): boolean => {
    if (!role) return false;

    switch (view) {
      case 'players':
        return role === 'admin';
      case 'newGame':
        return role === 'admin' || role === 'game_manager';
      case 'dashboard':
      case 'leaderboard':
      case 'history':
        return true; // All authenticated users
      default:
        return false;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--color-bg-secondary)',
        borderBottom: '2px solid var(--color-border)',
        padding: 'var(--spacing-lg) 0',
        marginBottom: 'var(--spacing-xl)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
              <button onClick={() => setCurrentView('dashboard')} className={currentView === 'dashboard' ? 'btn btn-primary' : 'btn btn-secondary'}>
                📊 Dashboard
              </button>
              {canAccessView('players') && (
                <button onClick={() => setCurrentView('players')} className={currentView === 'players' ? 'btn btn-primary' : 'btn btn-secondary'}>
                  👥 Players
                </button>
              )}
              {canAccessView('newGame') && (
                <button onClick={() => setCurrentView('newGame')} className={currentView === 'newGame' ? 'btn btn-primary' : 'btn btn-secondary'}>
                  🎮 New Game
                </button>
              )}
              <button onClick={() => setCurrentView('leaderboard')} className={currentView === 'leaderboard' ? 'btn btn-primary' : 'btn btn-secondary'}>
                🏆 Leaderboard
              </button>
              <button onClick={() => setCurrentView('history')} className={currentView === 'history' ? 'btn btn-primary' : 'btn btn-secondary'}>
                📜 History
              </button>
            </div>
            <UserMenu
              userPlayer={userPlayer}
              onNavigateToProfile={() => setCurrentView('myProfile')}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container" style={{ paddingBottom: 'var(--spacing-2xl)' }}>
        {currentView === 'dashboard' && (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div className="card fade-in">
              <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Welcome to MX Dart League! 🎯</h2>
              <p className="text-muted" style={{ marginBottom: 'var(--spacing-lg)' }}>
                Manage your daily dart competitions, track player statistics, and crown the Darter of the Month!
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>👥</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>{players.length}</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Total Players</div>
                </div>

                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>🎯</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>{games.length}</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Games This Month</div>
                </div>

                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>👑</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                    {stats.length > 0
                      ? [...stats].sort((a, b) => b.rating - a.rating)[0]?.playerName || '-'
                      : '-'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Current Leader</div>
                </div>
              </div>

              {canAccessView('newGame') && (
                <div className="mt-lg">
                  <button onClick={() => setCurrentView('newGame')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                    🎯 Start New Game
                  </button>
                </div>
              )}
            </div>

            <TodaysGames
              game={todaysGame}
              currentUserId={user?.id || null}
              role={role}
              onNavigateToResults={() => {
                // Load the existing game's groups into state
                if (todaysGame && todaysGame.groups) {
                  setDrawnGroups(todaysGame.groups);
                  setSelectedDate(todaysGame.date);
                  // Set selected players based on groups
                  const playerIds = todaysGame.groups.flatMap(g => g.players.map(p => p.id));
                  setSelectedPlayerIds(playerIds);
                }
                setCurrentView('newGame');
              }}
            />

            {stats.length > 0 && (
              <Leaderboard stats={stats} currentMonth={currentMonth} currentPlayerId={userPlayer?.id} />
            )}
          </div>
        )}

        {
          currentView === 'players' && canAccessView('players') && (
            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
              <PlayerManagement
                players={players}
                onAddPlayer={handleAddPlayer}
                onRemovePlayer={handleRemovePlayer}
              />
              <RoleManager />
            </div>
          )
        }

        {
          currentView === 'newGame' && canAccessView('newGame') && (
            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
              {role === 'admin' && (
                <div className="card">
                  <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Game Date</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        if (!isWeekend(newDate)) {
                          setSelectedDate(newDate);
                        } else {
                          alert('Cannot select weekend dates. Games are only allowed on weekdays.');
                        }
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        fontSize: '1rem',
                        flex: 1
                      }}
                    />
                    {selectedDate !== new Date().toISOString().split('T')[0] && (
                      <div style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        background: 'var(--color-accent-primary)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        Historical Game
                      </div>
                    )}
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-sm)' }}>
                    Select a past weekday to add a game that was forgotten
                  </p>

                  {(role === 'admin' || (role === 'game_manager' && selectedDate === new Date().toISOString().split('T')[0])) && (
                    <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <input
                        type="checkbox"
                        id="manualEntry"
                        checked={manualEntry}
                        onChange={(e) => setManualEntry(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="manualEntry" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                        Manual entry (skip group drawing)
                      </label>
                    </div>
                  )}
                </div>
              )}

              {isWeekend(selectedDate) && (
                <div className="card" style={{
                  background: 'var(--color-accent-danger)',
                  color: 'white',
                  border: 'none'
                }}>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', color: 'white' }}>⚠️ Weekend - No Games</h3>
                  <p style={{ margin: 0 }}>
                    Games cannot be created on weekends (Saturday & Sunday). Please select a weekday.
                  </p>
                </div>
              )}

              {!isWeekend(selectedDate) && (
                <>
                  <AttendanceSelector
                    players={players}
                    selectedPlayerIds={selectedPlayerIds}
                    onSelectionChange={setSelectedPlayerIds}
                    playersWhoPlayedToday={getPlayersWhoPlayedToday()}
                  />

                  {selectedPlayerIds.length >= 2 && !manualEntry && (
                    <GroupDrawer
                      presentPlayers={presentPlayers}
                      groups={drawnGroups}
                      onGroupsGenerated={handleGroupsGenerated}
                    />
                  )}
                </>
              )}

              {manualEntry && selectedPlayerIds.length >= 2 && !isWeekend(selectedDate) && (
                <ManualGroupCreator
                  presentPlayers={presentPlayers}
                  onGroupsCreated={handleGroupsGenerated}
                />
              )}

              {drawnGroups.length > 0 && (
                <ResultsEntry
                  groups={drawnGroups}
                  onResultsSubmit={handleResultsSubmit}
                />
              )}
            </div>
          )
        }

        {
          currentView === 'leaderboard' && (
            <Leaderboard
              stats={stats}
              currentMonth={currentMonth}
              currentPlayerId={userPlayer?.id}
            />
          )
        }

        {
          currentView === 'history' && (
            <GameHistory
              games={games}
              currentMonth={currentMonth}
              role={role}
              onDelete={handleDeleteGame}
            />
          )
        }

        {currentView === 'myProfile' && userPlayer && (
          <MyProfile
            player={userPlayer}
            stats={userStats}
            todaysGame={todaysGame}
            gameHistory={userGameHistory}
            currentMonth={currentMonth}
          />
        )}
      </div>

      {/* Player Claim Dialog */}
      {showPlayerClaim && (
        <PlayerClaimDialog
          players={players}
          onClaim={handlePlayerClaim}
          onClose={() => setShowPlayerClaim(false)}
          isAdmin={role === 'admin'}
        />
      )}
    </div>
  );
}

export default App;
