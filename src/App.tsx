import { useState, useEffect } from 'react';
import { Player, Group, DailyGame, MonthlyStats, GameResult } from './types/types';
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
import { useLanguage } from './contexts/LanguageContext';
import {
  loadPlayers,
  addPlayer as dbAddPlayer,
  removePlayer as dbRemovePlayer,
  loadMonthGames,
  saveIncompleteGame as dbSaveIncompleteGame,
  deleteGame as dbDeleteGame,
  getTodaysGames,
  getCurrentMonth,
  getPlayerByUserId,
  linkPlayerToUser,
  getUserGameHistory,
  saveGroupResults,
  updateDailyGroups
} from './utils/supabaseStorage';
import { calculateMonthlyRatings, calculateStatsFromGames } from './utils/ratingCalculator';
import './index.css';


type View = 'dashboard' | 'players' | 'newGame' | 'leaderboard' | 'history' | 'myProfile';

function App() {
  const { user, role, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<DailyGame[]>([]);
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [todaysGames, setTodaysGames] = useState<DailyGame[]>([]);
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
  const [isEditingGroups, setIsEditingGroups] = useState(false);

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
        const [loadedPlayers, loadedGames, loadedTodaysGames] = await Promise.all([
          loadPlayers(),
          loadMonthGames(currentMonth),
          getTodaysGames()
        ]);

        setPlayers(loadedPlayers);
        setGames(loadedGames);
        setTodaysGames(loadedTodaysGames);

        // Calculate stats client-side from completed games
        const calculatedStats = calculateStatsFromGames(loadedGames);
        const statsWithRatings = calculateMonthlyRatings(calculatedStats);
        setStats(statsWithRatings);

        // Load user's player association if logged in
        if (user?.id) {
          console.log('Loading player for user:', user.id);
          const player = await getPlayerByUserId(user.id);
          console.log('User player loaded:', player);
          setUserPlayer(player);

          if (player) {
            const playerHistory = await getUserGameHistory(player.id, currentMonth);

            // Calculate user stats from the main stats array
            const playerStats = statsWithRatings.find(s => s.playerId === player.id) || null;

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
    // Re-calculate if games change
    if (games.length > 0) {
      const calculatedStats = calculateStatsFromGames(games);
      const statsWithRatings = calculateMonthlyRatings(calculatedStats);
      if (JSON.stringify(statsWithRatings) !== JSON.stringify(stats)) {
        setStats(statsWithRatings);
      }
    }
  }, [games]);

  // Reload data helper
  const reloadData = async () => {
    try {
      const [loadedPlayers, loadedGames, loadedTodaysGames] = await Promise.all([
        loadPlayers(),
        loadMonthGames(currentMonth),
        getTodaysGames()
      ]);

      setPlayers(loadedPlayers);
      setGames(loadedGames);
      setTodaysGames(loadedTodaysGames);

      const calculatedStats = calculateStatsFromGames(loadedGames);
      const statsWithRatings = calculateMonthlyRatings(calculatedStats);
      setStats(statsWithRatings);

      // Update user stats if logged in
      if (userPlayer) {
        const playerStats = statsWithRatings.find(s => s.playerId === userPlayer.id) || null;
        setUserStats(playerStats);

        const history = await getUserGameHistory(userPlayer.id, currentMonth);
        setUserGameHistory(history);
      }
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
    // Save incomplete game to database so it appears in Today's Games
    // This generates real UUIDs for the groups
    const gameIds = await dbSaveIncompleteGame(selectedDate, currentMonth, groups);

    if (gameIds && gameIds.length > 0) {
      await reloadData(); // Reload to show in Today's Games

      // Fetch fresh data to get the real UUIDs
      const freshGames = await getTodaysGames();
      if (freshGames.length > 0) {
        setTodaysGames(freshGames); // Ensure state is largely consistent
        const allGroups = freshGames.flatMap(g => g.groups);
        setDrawnGroups(allGroups);
      }
    }
  };

  const handleResultsSubmit = async (groupsWithResults: Group[]) => {
    console.log('handleResultsSubmit - Starting with groups:', groupsWithResults);
    // Logic for bulk submit is deprecated/hidden but we can keep basic handling or leave as is since button is hidden
    // For now, assume this flow is replaced by per-group submission
  };

  const handleGroupResultSubmit = async (groupId: string, results: GameResult[]) => {
    const success = await saveGroupResults(groupId, results);
    if (success) {
      await reloadData();

      // Update drawnGroups with the new results to reflect saved state immediately
      setDrawnGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, results };
        }
        return g;
      }));
    } else {
      alert('Failed to save group results');
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
          <h2>{t('common.loading')}</h2>
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
          <h2>{t('common.loading')}</h2>
          <p className="text-muted">{t('common.connecting')}</p>
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
                {t('nav.dashboard')}
              </button>
              {canAccessView('players') && (
                <button onClick={() => setCurrentView('players')} className={currentView === 'players' ? 'btn btn-primary' : 'btn btn-secondary'}>
                  {t('nav.players')}
                </button>
              )}
              {canAccessView('newGame') && (
                <button
                  onClick={() => {
                    setCurrentView('newGame');
                    // Auto-load today's groups if available
                    if (todaysGames.length > 0 && selectedDate === new Date().toISOString().split('T')[0]) {
                      const allGroups = todaysGames.flatMap(g => g.groups);
                      setDrawnGroups(allGroups);
                      const playerIds = allGroups.flatMap(g => g.players.map(p => p.id));
                      setSelectedPlayerIds(playerIds);
                    }
                  }}
                  className={currentView === 'newGame' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                  {t('nav.newGame')}
                </button>
              )}
              <button onClick={() => setCurrentView('leaderboard')} className={currentView === 'leaderboard' ? 'btn btn-primary' : 'btn btn-secondary'}>
                {t('nav.leaderboard')}
              </button>
              <button onClick={() => setCurrentView('history')} className={currentView === 'history' ? 'btn btn-primary' : 'btn btn-secondary'}>
                {t('nav.history')}
              </button>
            </div>
            <div className="flex items-center gap-md">
              <UserMenu
                userPlayer={userPlayer}
                onNavigateToProfile={() => setCurrentView('myProfile')}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container" style={{ paddingBottom: 'var(--spacing-2xl)' }}>
        {currentView === 'dashboard' && (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div className="card fade-in">
              <h2 style={{ marginBottom: 'var(--spacing-md)' }}>{t('dashboard.welcome')}</h2>
              <p className="text-muted" style={{ marginBottom: 'var(--spacing-lg)' }}>
                {t('dashboard.description')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>👥</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>{players.length}</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>{t('dashboard.totalPlayers')}</div>
                </div>

                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>🎯</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>{games.length}</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>{t('dashboard.gamesMonth')}</div>
                </div>

                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>👑</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                    {stats.length > 0
                      ? [...stats].sort((a, b) => b.rating - a.rating)[0]?.playerName || '-'
                      : '-'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>{t('dashboard.currentLeader')}</div>
                </div>
              </div>

              {canAccessView('newGame') && (
                <div className="mt-lg">
                  <button onClick={() => setCurrentView('newGame')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                    {t('dashboard.startNewGame')}
                  </button>
                </div>
              )}
            </div>

            <TodaysGames
              games={todaysGames}
              currentUserId={user?.id || null}
              role={role}
              onNavigateToResults={() => {
                // Load the existing games groups into state
                if (todaysGames.length > 0) {
                  // Flatten groups from all games
                  const allGroups = todaysGames.flatMap(g => g.groups);
                  setDrawnGroups(allGroups);

                  if (todaysGames[0]) {
                    setSelectedDate(todaysGames[0].date);
                  }

                  // Set selected players based on groups
                  const playerIds = allGroups.flatMap(g => g.players.map(p => p.id));
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
                  <h3 style={{ marginBottom: 'var(--spacing-md)' }}>{t('game.date')}</h3>
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
                    {t('game.selectPastDate')}
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
                        {t('game.manualEntry')}
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
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', color: 'white' }}>{t('game.weekendWarning')}</h3>
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

                  {selectedPlayerIds.length >= 2 && !manualEntry && drawnGroups.length === 0 && (
                    <GroupDrawer
                      presentPlayers={presentPlayers}
                      groups={drawnGroups}
                      onGroupsGenerated={handleGroupsGenerated}
                    />
                  )}
                </>
              )}


              {manualEntry && selectedPlayerIds.length >= 2 && !isWeekend(selectedDate) && !isEditingGroups && drawnGroups.length === 0 && (
                <ManualGroupCreator
                  presentPlayers={presentPlayers}
                  onGroupsCreated={handleGroupsGenerated}
                />
              )}

              {isEditingGroups && (
                <div className="card fade-in">
                  <div className="flex items-center justify-between mb-md">
                    <h3 style={{ margin: 0 }}>{t('manual.title')}</h3>
                    <div className="flex gap-sm">
                      <button
                        onClick={async () => {
                          if (window.confirm(t('history.deleteConfirmation') || 'Are you sure you want to delete all scheduled games for today?')) {
                            const success = await updateDailyGroups(selectedDate, currentMonth, []);
                            if (success) {
                              await reloadData();
                              setIsEditingGroups(false);
                              setTodaysGames([]);
                              setDrawnGroups([]);
                            } else {
                              alert('Failed to delete games');
                            }
                          }
                        }}
                        className="btn"
                        style={{
                          background: 'var(--color-accent-danger)',
                          color: 'white',
                          border: 'none'
                        }}
                      >
                        {t('common.delete')}
                      </button>
                      <button
                        onClick={() => setIsEditingGroups(false)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <ManualGroupCreator
                    presentPlayers={presentPlayers}
                    initialGroups={drawnGroups}
                    onGroupsCreated={async (newGroups) => {
                      const success = await updateDailyGroups(selectedDate, currentMonth, newGroups);
                      if (success) {
                        await reloadData();
                        setIsEditingGroups(false);

                        // Refresh local state
                        const freshGames = await getTodaysGames();
                        if (freshGames.length > 0) {
                          setTodaysGames(freshGames);
                          setDrawnGroups(freshGames.flatMap(g => g.groups));
                        }
                      } else {
                        alert('Failed to update groups');
                      }
                    }}
                  />
                </div>
              )}

              {drawnGroups.length > 0 && !isEditingGroups && (
                <>
                  {(role === 'admin' || role === 'game_manager') && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-md)' }}>
                      <button
                        onClick={() => setIsEditingGroups(true)}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                      >
                        {t('manual.editGroups') || 'Edit Groups'}
                      </button>
                    </div>
                  )}
                  <ResultsEntry
                    groups={drawnGroups}
                    onResultsSubmit={handleResultsSubmit}
                    onGroupSubmit={handleGroupResultSubmit}
                  />
                </>
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
            todaysGames={todaysGames}
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
