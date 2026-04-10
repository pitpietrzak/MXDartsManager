import React, { useState, useEffect } from 'react';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { Player, MonthlyStats, DailyGame } from '../types/types';
import { updatePlayer, setPlayerAbsence } from '../utils/supabaseStorage';
import { TodaysGames } from './TodaysGames';
import { AbsenceCalendar } from './AbsenceCalendar';

interface MyProfileProps {
    player: Player | null;
    stats: MonthlyStats | null;
    todaysGames: DailyGame[];
    gameHistory: DailyGame[];
    currentMonth: string;
    onNavigateToResults?: () => void;
}

export const MyProfile: React.FC<MyProfileProps> = ({
    player,
    stats,
    todaysGames,
    gameHistory,
    currentMonth,
    onNavigateToResults
}) => {
    const { t, language } = useLanguage();
    const { user, updateDisplayName } = useAuth();
    const { showToast } = useToast();
    const { preferences, toggleHighlightYourGames } = useUserPreferences();
    const [isUpdating, setIsUpdating] = useState(false);
    const [playerState, setPlayerState] = useState<Player | null>(player);
    const [isEditingEmoji, setIsEditingEmoji] = useState(false);
    const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');

    useEffect(() => {
        setPlayerState(player);
    }, [player]);

    const handleUpdateDisplayName = async () => {
        setIsUpdating(true);
        const { error } = await updateDisplayName(displayName);
        if (error) {
            showToast(t('common.error'), 'error');
        } else {
            showToast(t('profile.updated'), 'success');
        }
        setIsUpdating(false);
    };

    const handleUpdateProfile = async (updates: Partial<Player>) => {
        if (!playerState) return;
        setIsUpdating(true);
        const updatedPlayer = { ...playerState, ...updates };
        setPlayerState(updatedPlayer); // Optimistic update

        const success = await updatePlayer(updatedPlayer);
        if (!success) {
            setPlayerState(playerState); // Revert on failure
            alert(t('common.error'));
        }

        // Sync absence if isPlayingToday changed
        if (updates.isPlayingToday !== undefined) {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // If playing (true) -> Available (not absent)
            // If not playing (false) -> Absent (true)
            await setPlayerAbsence(playerState.id, dateStr, !updates.isPlayingToday);
        }

        setIsUpdating(false);
    };

    const handleAbsenceChange = async (date: string, isAbsent: boolean) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // If the changed date is today, update the toggle
        if (date === dateStr) {
            // If absent -> not playing
            // If available -> playing
            const isPlaying = !isAbsent;
            if (playerState?.isPlayingToday !== isPlaying) {
                // Update state without triggering another absence sync loop (handleUpdateProfile handles sync, so we need to be careful)
                // Actually relying on handleUpdateProfile is fine because setPlayerAbsence is idempotent-ish or cheap.
                handleUpdateProfile({ isPlayingToday: isPlaying });
            }
        }
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        handleUpdateProfile({ emoji: emojiData.emoji });
        setIsEditingEmoji(false);
    };

    const winRate = stats && stats.totalWins + stats.totalLosses > 0
        ? ((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1)
        : '0.0';

    return (
        <>
            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                {/* Account Settings (Available to all users) */}
                <div className="card fade-in">
                    <div className="card-header">
                        <h3 className="card-title">👤 {t('profile.accountSettings')}</h3>
                    </div>
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 600 }}>
                                {t('profile.displayName')}
                            </label>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder={player?.name || ''}
                                    style={{
                                        flex: 1,
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-bg-secondary)',
                                        color: 'var(--color-text-primary)'
                                    }}
                                />
                                <button
                                    onClick={handleUpdateDisplayName}
                                    disabled={isUpdating || displayName === (user?.user_metadata?.display_name || '')}
                                    className="btn btn-primary"
                                >
                                    {t('common.confirm')}
                                </button>
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
                                {t('profile.displayNameDesc')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Player Header */}
                {playerState && (
                    <div className="card fade-in" style={{
                        background: 'linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-success) 100%)',
                        color: 'white',
                        border: 'none'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <div
                                onClick={() => setIsEditingEmoji(true)}
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                title={t('profile.emoji')}
                            >
                                {playerState.emoji || playerState.name.charAt(0).toUpperCase()}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    right: '0',
                                    background: 'rgba(0,0,0,0.5)',
                                    borderRadius: '50%',
                                    padding: '4px',
                                    fontSize: '0.75rem'
                                }}>✏️</div>
                            </div>
                            {isEditingEmoji && (
                                <div style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    width: '100vw',
                                    height: '100vh',
                                    background: 'rgba(0,0,0,0.5)',
                                    zIndex: 1000,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }} onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditingEmoji(false);
                                }}>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <EmojiPicker
                                            onEmojiClick={handleEmojiClick}
                                            theme={window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT}
                                            autoFocusSearch={false}
                                        />
                                    </div>
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <h2 style={{ margin: 0, color: 'white', fontSize: '1.75rem' }}>
                                    {playerState.name}
                                </h2>
                                <p style={{ margin: 'var(--spacing-xs) 0 0 0', opacity: 0.9 }}>
                                    {t('profile.title')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Profile Settings */}
                {playerState && (
                    <div className="card fade-in">
                        <div className="card-header">
                            <h3 className="card-title">⚙️ {t('profile.settings')}</h3>
                        </div>
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            {/* Playing Status Toggle */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{t('profile.isPlayingToday')}</div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        {playerState.isPlayingToday ? t('profile.setUnavailable') : t('profile.setAvailable')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                    <label className="switch switch-sm">
                                        <input
                                            type="checkbox"
                                            checked={playerState.isPlayingToday !== false}
                                            onChange={(e) => handleUpdateProfile({ isPlayingToday: e.target.checked })}
                                            disabled={isUpdating}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span style={{ fontSize: '1.5rem', transition: 'transform 0.2s' }}>
                                        {playerState.isPlayingToday !== false ? '😃' : '😞'}
                                    </span>
                                </div>
                            </div>

                            {/* Highlight Games Toggle */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{t('profile.highlightYourGames')}</div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        {t('profile.highlightYourGamesDesc')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                    <label className="switch switch-sm">
                                        <input
                                            type="checkbox"
                                            checked={preferences.highlightYourGames}
                                            onChange={toggleHighlightYourGames}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span style={{ fontSize: '1.5rem' }}>
                                        {preferences.highlightYourGames ? '🔦' : '🌑'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Absence Calendar */}
                {playerState && (
                    <AbsenceCalendar
                        playerId={playerState.id}
                        isScriptPlayingToday={playerState.isPlayingToday}
                        onAbsenceChange={handleAbsenceChange}
                    />
                )}

                {/* Stats Overview */}
                {stats && (
                    <div className="card fade-in">
                        <div className="card-header">
                            <h3 className="card-title">📊 {currentMonth} {t('profile.statsTitle')}</h3>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: 'var(--spacing-md)'
                        }}>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                    {stats.gamesPlayed}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>{t('profile.gamesPlayed')}</div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-success)' }}>
                                    {stats.totalWins}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>{t('common.wins')}</div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-danger)' }}>
                                    {stats.totalLosses}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>{t('common.losses')}</div>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                    {winRate}%
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>{t('profile.winRate')}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Today's Game */}
                {playerState && todaysGames.length > 0 && (
                    <TodaysGames
                        games={todaysGames}
                        currentUserId={playerState.id}
                        role={null}
                        onNavigateToResults={onNavigateToResults}
                    />
                )}

                {/* Game History */}
                {playerState && (
                    <div className="card fade-in">
                        <div className="card-header">
                            <h3 className="card-title">{t('profile.historyTitle')}</h3>
                            <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                                {gameHistory.length} {t('profile.gamesThisMonth')}
                            </p>
                        </div>

                        {gameHistory.length === 0 ? (
                            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                                {t('profile.noGames')}
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                {gameHistory.map(game => {
                                    // Find the group and result for this player
                                    let myGroup = null;
                                    let myResult = null;

                                    for (const group of game.groups) {
                                        const result = group.results?.find(r => r.playerId === playerState.id);
                                        if (result) {
                                            myGroup = group;
                                            myResult = result;
                                            break;
                                        }
                                    }

                                    if (!myGroup || !myResult) return null;

                                    const isWinner = myResult.position === 1;

                                    return (
                                        <div
                                            key={game.id}
                                            style={{
                                                padding: 'var(--spacing-md)',
                                                background: isWinner ? 'rgba(34, 197, 94, 0.05)' : 'var(--color-bg-secondary)',
                                                borderRadius: 'var(--radius-md)',
                                                border: isWinner ? '2px solid var(--color-accent-success)' : '1px solid var(--color-border-light)',
                                                color: 'inherit'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                                <div style={{ fontWeight: 600 }}>
                                                    {new Date(game.date).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                                <div style={{
                                                    padding: '2px 8px',
                                                    background: isWinner ? 'var(--color-accent-success)' : 'var(--color-accent-primary)',
                                                    color: 'white',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}>
                                                    {isWinner ? t('common.winner') : `#${myResult.position}`}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.875rem', opacity: isWinner ? 0.9 : 0.7 }}>
                                                {myResult.wins}W - {myResult.losses}L
                                                {' • '}
                                                {myGroup.players.length} {t('common.players')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
