import { useState, useEffect, useMemo } from 'react';
import { PasswordReset } from './components/PasswordReset';
import { supabase } from './lib/supabase';
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
import { PrintableTable } from './components/PrintableTable';
import { PlayerClaimDialog } from './components/PlayerClaimDialog';
import { MyProfile } from './components/MyProfile';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { useToast } from './contexts/ToastContext';
import {
  loadPlayers,
  addPlayer as dbAddPlayer,
  removePlayer as dbRemovePlayer,
  loadMonthGames,
  deleteGame as dbDeleteGame,
  getDailyGames,
  getPendingGames,
  getCurrentMonth,
  linkPlayerToUser,
  getUserGameHistory,
  saveGroupResults,
  updateDailyGroups
} from './utils/supabaseStorage';
import { calculateMonthlyRatings, calculateStatsFromGames } from './utils/ratingCalculator';
import { getPreviousGameday } from './utils/groupOrderer';
import './index.css';


type View = 'dashboard' | 'players' | 'newGame' | 'leaderboard' | 'history' | 'myProfile' | 'printTable';

function App() {
  const { user, role, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<DailyGame[]>([]);

  // Listen for password recovery event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const stats = useMemo(() => {
    if (games.length === 0) return [];
    const calculatedStats = calculateStatsFromGames(games);
    return calculateMonthlyRatings(calculatedStats);
  }, [games]);

  // History/Leaderboard month selector state
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>(getCurrentMonth());
  const [historyGames, setHistoryGames] = useState<DailyGame[]>([]);
  const [historyStats, setHistoryStats] = useState<ReturnType<typeof calculateMonthlyRatings>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Generate list of months from February 2026 to the current month
    const availableMonths = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    const earliest = new Date(2026, 1, 1); // February 2026
    // Start from next month to allow printing/viewing future months
    const cursor = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    while (cursor >= earliest) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return months;
  }, []);


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
  const [isPublicView, setIsPublicView] = useState(false);

  // Check for public view on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'results' || params.get('view') === 'public') {
      setIsPublicView(true);
      setCurrentView('leaderboard');
    }
  }, []);

  const currentMonth = getCurrentMonth();

  // Compute last month string (YYYY-MM)
  const lastMonth = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Darter of last month
  const [darterOfLastMonth, setDarterOfLastMonth] = useState<{ playerName: string; playerId: string; rating: number } | null>(null);
  const [lastMonthGames, setLastMonthGames] = useState<DailyGame[]>([]);

  // Compute which players are recently active (≥3 distinct days played across this month and last month)
  const activePlayerIds = useMemo(() => {
    const daysMap = new Map<string, Set<string>>();
    const allGames = [...games, ...lastMonthGames];

    allGames.forEach(game => {
      if (!game.completed) return;
      game.groups.forEach(group => {
        group.results?.forEach(r => {
          if (!daysMap.has(r.playerId)) daysMap.set(r.playerId, new Set());
          daysMap.get(r.playerId)!.add(game.date);
        });
      });
    });

    const ids = new Set<string>();
    daysMap.forEach((dates, playerId) => { if (dates.size >= 3) ids.add(playerId); });
    return ids;
  }, [games, lastMonthGames]);

  // Compute previous gameday games for player ordering in group draw
  const previousGamedayGames = useMemo(() => {
    const prevDate = getPreviousGameday(selectedDate, games);
    if (!prevDate) return [];
    return games.filter(g => g.date === prevDate && g.completed);
  }, [selectedDate, games]);

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
        const [loadedPlayers, loadedGames, loadedPendingGames, lastMonthGamesData] = await Promise.all([
          loadPlayers(),
          loadMonthGames(currentMonth),
          getPendingGames(),
          loadMonthGames(lastMonth)
        ]);

        setPlayers(loadedPlayers);
        setGames(loadedGames);
        setTodaysGames(loadedPendingGames);
        setLastMonthGames(lastMonthGamesData);

        // Compute darter of last month
        if (lastMonthGamesData.length > 0) {
          const lastMonthStats = calculateMonthlyRatings(calculateStatsFromGames(lastMonthGamesData));
          const top = [...lastMonthStats].sort((a, b) => b.rating - a.rating)[0];
          if (top && top.gamesPlayed > 0) {
            setDarterOfLastMonth({ playerName: top.playerName, playerId: top.playerId, rating: top.rating });
          }
        }

        // Calculate stats client-side from completed games
        const calculatedStats = calculateStatsFromGames(loadedGames);
        const statsWithRatings = calculateMonthlyRatings(calculatedStats);

        // Load user's player association if logged in
        if (user?.id) {
          console.log('Loading player for user:', user.id);
          // Find player in loaded players list to ensure we have latest data (including emoji)
          // The RPC getPlayerByUserId might return stale data or missing columns
          const player = loadedPlayers.find(p => p.userId === user.id) || null;
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



  // Reload data helper
  const reloadData = async () => {
    try {
      const [loadedPlayers, loadedGames, loadedPendingGames] = await Promise.all([
        loadPlayers(),
        loadMonthGames(currentMonth),
        getPendingGames()
      ]);

      setPlayers(loadedPlayers);
      setGames(loadedGames);
      setTodaysGames(loadedPendingGames);

      const calculatedStats = calculateStatsFromGames(loadedGames);
      const statsWithRatings = calculateMonthlyRatings(calculatedStats);

      // Update user stats if logged in
      if (userPlayer) {
        const playerStats = statsWithRatings.find(s => s.playerId === userPlayer.id) || null;
        setUserStats(playerStats);

        // Update user player details
        const updatedUserPlayer = loadedPlayers.find(p => p.id === userPlayer.id);
        if (updatedUserPlayer) {
          setUserPlayer(updatedUserPlayer);
        }

        const history = await getUserGameHistory(userPlayer.id, currentMonth);
        setUserGameHistory(history);
      }
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  // Refresh data on view change
  useEffect(() => {
    if (!loading) {
      reloadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Load history/leaderboard data whenever the selected month changes
  useEffect(() => {
    if (currentView !== 'history' && currentView !== 'leaderboard') return;

    // If the selected month is the current month, reuse already-loaded data
    if (selectedHistoryMonth === currentMonth) {
      setHistoryGames(games);
      setHistoryStats(stats);
      return;
    }

    // Otherwise fetch from Supabase
    let cancelled = false;
    setHistoryLoading(true);
    loadMonthGames(selectedHistoryMonth).then((loaded) => {
      if (cancelled) return;
      setHistoryGames(loaded);
      const calculatedStats = calculateStatsFromGames(loaded);
      setHistoryStats(calculateMonthlyRatings(calculatedStats));
      setHistoryLoading(false);
    }).catch(() => {
      if (!cancelled) setHistoryLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHistoryMonth, currentView]);

  // When switching to history/leaderboard, sync current-month data if selectedHistoryMonth === currentMonth
  useEffect(() => {
    if ((currentView === 'history' || currentView === 'leaderboard') && selectedHistoryMonth === currentMonth) {
      setHistoryGames(games);
      setHistoryStats(stats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, games, stats]);

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
    // Update daily groups (replaces existing incomplete games for this date)
    // This prevents duplicates if the user clicks save multiple times or edits
    const success = await updateDailyGroups(selectedDate, currentMonth, groups);

    if (success) {
      await reloadData(); // Update everything

      // Fetch fresh data for the SELECTED date to get the real UUIDs
      const freshGames = await getDailyGames(selectedDate);
      if (freshGames.length > 0) {
        // If we really are on today's date, update todaysGames too
        if (selectedDate === new Date().toISOString().split('T')[0]) {
          setTodaysGames(freshGames);
        }

        const allGroups = freshGames.flatMap(g => g.groups);
        setDrawnGroups(allGroups);
      }
    } else {
      alert('Failed to save groups');
    }
  };




  // ... (unchanged code) ...



  const handleResultsSubmit = async (groupsWithResults: Group[]) => {
    console.log('handleResultsSubmit - Starting with groups:', groupsWithResults);
    // Logic for bulk submit is deprecated/hidden but we can keep basic handling or leave as is since button is hidden
    // For now, assume this flow is replaced by per-group submission
  };

  const handleGroupResultSubmit = async (groupId: string, results: GameResult[]) => {
    const success = await saveGroupResults(groupId, results);
    if (success) {
      showToast(t('game.resultsConfirmed'), 'success');
      await reloadData();

      // Remove the confirmed group from drawnGroups so it disappears from the view
      setDrawnGroups(prev => prev.filter(g => g.id !== groupId));
    } else {
      showToast('Failed to save group results', 'error');
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

  // Show password reset if applicable
  if (isPasswordReset) {
    return <PasswordReset />;
  }

  // Show login if not authenticated
  if (!user && !isPublicView) {
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
        return role === 'admin' || role === 'game_manager' || role === 'chef';
      case 'dashboard':
      case 'leaderboard':
      case 'history':
        return true; // All authenticated users
      default:
        return false;
    }
  };

  return (
    <div style={{
      height: '100vh',
      background: isPublicView ? '#ffffff' : 'var(--color-bg-primary)',
      overflow: isPublicView ? 'hidden' : 'auto'
    }}>
      {/* Header */}
      {!isPublicView && (
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
      )}

      {/* Main Content */}
      <div className={isPublicView ? "" : "container"} style={{
        paddingBottom: isPublicView ? 0 : 'var(--spacing-2xl)',
        paddingTop: isPublicView ? 'var(--spacing-md)' : 0,
        width: isPublicView ? '100%' : 'auto',
        maxWidth: isPublicView ? '100%' : '1200px',
        margin: isPublicView ? 0 : '0 auto'
      }}>
        {isPublicView && (
          <div style={{ textAlign: 'center', margin: '5px 0' }}>
            <h1 style={{ color: '#101828', margin: 0, fontSize: '2rem', fontWeight: 900 }}>{t('app.title')}</h1>
            <p className="text-muted" style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 700 }}>
              {t('leaderboard.title').replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{1F1FF}]/gu, '').trim()}
            </p>
          </div>
        )}
        {currentView === 'dashboard' && (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <div className="card fade-in">
              <h2 style={{ marginBottom: 'var(--spacing-md)', textAlign: 'center' }}>{t('dashboard.welcome')}</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>👥</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>{stats.length}</div>
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
              currentUserId={userPlayer?.id || null}
              role={role}
              onCancelGame={handleDeleteGame}
              onNavigateToResults={(date) => {
                // If date is provided, set it. Otherwise fallback to first game's date
                const targetDate = date || (todaysGames[0]?.date) || new Date().toISOString().split('T')[0];
                setSelectedDate(targetDate);

                // Load the groups for the target date
                const gamesForDate = todaysGames.filter(g => g.date === targetDate);
                const allGroups = gamesForDate.flatMap(g => g.groups);
                setDrawnGroups(allGroups);

                // Set selected players based on groups
                const playerIds = allGroups.flatMap(g => g.players.map(p => p.id));
                setSelectedPlayerIds(playerIds);

                setCurrentView('newGame');
              }}
            />

            {darterOfLastMonth && (
              <div
                style={{
                  padding: 'var(--spacing-lg)',
                  background: 'var(--gradient-primary)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-xs)' }}>👑</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.85, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 'var(--spacing-xs)' }}>
                  {t('leaderboard.darterOfMonth')} — {new Date(parseInt(lastMonth.split('-')[0]), parseInt(lastMonth.split('-')[1]) - 1).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '1.375rem', fontWeight: 800 }}>{darterOfLastMonth.playerName}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.85, marginTop: 'var(--spacing-xs)' }}>
                  {t('leaderboard.rating')}: {darterOfLastMonth.rating.toFixed(3)}
                </div>
              </div>
            )}

            {stats.length > 0 && (
              <Leaderboard
                stats={stats}
                currentMonth={currentMonth}
                currentPlayerId={userPlayer?.id}
                players={players}
                darterOfLastMonthId={darterOfLastMonth?.playerId}
                darterOfLastMonthString={lastMonth}
                onPrintClick={(role === 'admin' || role === 'game_manager' || role === 'chef') ? () => setCurrentView('printTable') : undefined}
              />
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

        {currentView === 'newGame' && canAccessView('newGame') && (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            {(role === 'admin' || role === 'game_manager' || role === 'chef') && (
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

                        // Reset state when date changes
                        if (newDate === new Date().toISOString().split('T')[0]) {
                          // If switching back to today, reload today's games
                          if (todaysGames.length > 0) {
                            const allGroups = todaysGames.flatMap(g => g.groups);
                            setDrawnGroups(allGroups);
                            const playerIds = allGroups.flatMap(g => g.players.map(p => p.id));
                            setSelectedPlayerIds(playerIds);
                          }
                        } else {
                          // If switching to a past date, clear current groups to allow new entry
                          setDrawnGroups([]);
                          setSelectedPlayerIds([]);
                          // We could also check for incomplete games on this past date here,
                          // but for now, we assume the user wants to enter new data.
                        }
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

                {(role === 'admin' || role === 'game_manager' || role === 'chef') && (
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
                  activePlayerIds={activePlayerIds}
                  selectedDate={selectedDate}
                />

                {selectedPlayerIds.length >= 2 && !manualEntry && drawnGroups.length === 0 && (
                  <GroupDrawer
                    presentPlayers={presentPlayers}
                    groups={drawnGroups}
                    onGroupsGenerated={handleGroupsGenerated}
                    currentUserId={userPlayer?.id}
                    previousGamedayGames={previousGamedayGames}
                    stats={stats}
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
                      const freshGames = await getDailyGames(selectedDate);
                      if (freshGames.length > 0) {
                        if (selectedDate === new Date().toISOString().split('T')[0]) {
                          setTodaysGames(freshGames);
                        }
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
                  currentUserId={userPlayer?.id}
                  date={selectedDate}
                />
              </>
            )}
          </div>
        )
        }

        {
          currentView === 'leaderboard' && (
            <Leaderboard
              stats={historyStats}
              currentMonth={selectedHistoryMonth}
              currentPlayerId={userPlayer?.id}
              players={players}
              selectedMonth={selectedHistoryMonth}
              availableMonths={availableMonths}
              onMonthChange={setSelectedHistoryMonth}
              isLoading={historyLoading}
              darterOfLastMonthId={darterOfLastMonth?.playerId}
              darterOfLastMonthString={lastMonth}
              isPublicView={isPublicView}
              onPrintClick={(role === 'admin' || role === 'game_manager') ? () => setCurrentView('printTable') : undefined}
            />
          )
        }

        {
          currentView === 'history' && (
            <GameHistory
              games={historyGames}
              currentPlayerId={userPlayer?.id}
              role={role}
              onDelete={handleDeleteGame}
              selectedMonth={selectedHistoryMonth}
              availableMonths={availableMonths}
              onMonthChange={setSelectedHistoryMonth}
              isLoading={historyLoading}
            />
          )
        }

        {currentView === 'myProfile' && user && (
          <MyProfile
            player={userPlayer}
            stats={userStats}
            todaysGames={todaysGames}
            gameHistory={userGameHistory}
            currentMonth={currentMonth}
          />
        )}

        {currentView === 'printTable' && (role === 'admin' || role === 'game_manager') && (
          <PrintableTable
            players={players}
            availableMonths={availableMonths}
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
