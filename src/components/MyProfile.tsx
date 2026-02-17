import { useState, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Player, MonthlyStats, DailyGame } from '../types/types';
import { TodaysGames } from './TodaysGames';
import { useLanguage } from '../contexts/LanguageContext';
import { updatePlayer } from '../utils/supabaseStorage';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

interface MyProfileProps {
    player: Player;
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
    const { preferences, toggleHighlightYourGames } = useUserPreferences();
    const [isUpdating, setIsUpdating] = useState(false);
    const [playerState, setPlayerState] = useState(player);
    const [isEditingEmoji, setIsEditingEmoji] = useState(false);

    useEffect(() => {
        setPlayerState(player);
    }, [player]);

    const handleUpdateProfile = async (updates: Partial<Player>) => {
        setIsUpdating(true);
        const updatedPlayer = { ...playerState, ...updates };
        setPlayerState(updatedPlayer); // Optimistic update

        const success = await updatePlayer(updatedPlayer);
        if (!success) {
            setPlayerState(playerState); // Revert on failure
            alert(t('common.error'));
        }
        setIsUpdating(false);
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        handleUpdateProfile({ emoji: emojiData.emoji });
        setIsEditingEmoji(false);
    };

    const winRate = stats && stats.totalWins + stats.totalLosses > 0
        ? ((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1)
        : '0.0';

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            {/* Player Header */}
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
                        {playerState.emoji || player.name.charAt(0).toUpperCase()}
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
                            {player.name}
                        </h2>
                        <p style={{ margin: 'var(--spacing-xs) 0 0 0', opacity: 0.9 }}>
                            {t('profile.title')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Profile Settings */}
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
            {todaysGames.length > 0 && (
                <TodaysGames
                    games={todaysGames}
                    currentUserId={player.id}
                    role={null}
                    onNavigateToResults={onNavigateToResults}
                />
            )}

            {/* Game History */}
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
                                const result = group.results?.find(r => r.playerId === player.id);
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
        </div>
    );
};
