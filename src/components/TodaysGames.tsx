import React from 'react';
import { DailyGame } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

interface TodaysGamesProps {
    games: DailyGame[];
    currentUserId: string | null;
    role: 'admin' | 'game_manager' | 'chef' | 'user' | null;
    onNavigateToResults?: (date?: string) => void;
    onCancelGame?: (gameId: string) => void;
}

export const TodaysGames: React.FC<TodaysGamesProps> = ({
    games,
    currentUserId,
    role,
    onNavigateToResults,
    onCancelGame
}) => {
    const { t, language } = useLanguage();
    const { preferences } = useUserPreferences();

    // Override currentUserId if highlighting is disabled
    const effectiveUserId = preferences.highlightYourGames ? currentUserId : null;

    if (games.length === 0) {
        return (
            <div className="card fade-in">
                <div className="card-header">
                    <h3 className="card-title">{t('game.todaysGames')}</h3>
                </div>
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    {t('game.noGamesScheduled')}
                </p>
            </div>
        );
    }

    // Group games by date
    const gamesByDate = games.reduce((acc, game) => {
        if (!acc[game.date]) acc[game.date] = [];
        acc[game.date].push(game);
        return acc;
    }, {} as Record<string, DailyGame[]>);

    const sortedDates = Object.keys(gamesByDate).sort((a, b) => a.localeCompare(b));
    const today = new Date().toISOString().split('T')[0];
    const hasOnlyToday = sortedDates.length === 1 && sortedDates[0] === today;

    const formatDate = (dateStr: string) => {
        if (dateStr === today) return t('common.today');
        const date = new Date(dateStr);
        return date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="card fade-in" style={{
            border: '2px solid var(--color-accent-primary)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                    <div>
                        <h3 className="card-title">
                            {hasOnlyToday ? t('game.todaysGames') : t('game.pendingGames')}
                        </h3>
                        <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                            {games.length} {games.length === 1 ? t('common.game') : t('common.games')} {t('game.scheduled')} · {t('game.orderedByLastGames')}
                        </p>
                    </div>
                    {(role === 'admin' || role === 'game_manager' || role === 'chef') && onNavigateToResults && hasOnlyToday && (
                        <button
                            onClick={() => onNavigateToResults()}
                            className="btn btn-primary"
                            style={{ fontSize: '0.875rem' }}
                        >
                            {t('game.submitResults')}
                        </button>
                    )}
                </div>
            </div>

            <div style={{ padding: 'var(--spacing-md)', display: 'grid', gap: 'var(--spacing-lg)' }}>
                {sortedDates.map(date => (
                    <div key={date}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            margin: '0 0 var(--spacing-sm) 0'
                        }}>
                            {!hasOnlyToday && (
                                <h4 style={{
                                    margin: 0,
                                    fontSize: '0.9rem',
                                    color: 'var(--color-accent-primary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    📅 {formatDate(date)}
                                </h4>
                            )}
                            {!hasOnlyToday && (role === 'admin' || role === 'game_manager' || role === 'chef') && onNavigateToResults && (
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                    {role === 'admin' && onCancelGame && (
                                        <button
                                            onClick={() => {
                                                const gameId = gamesByDate[date][0]?.id;
                                                if (gameId) onCancelGame(gameId);
                                            }}
                                            className="btn btn-sm"
                                            title={t('common.delete')}
                                            style={{ 
                                                fontSize: '0.75rem', 
                                                padding: '4px 8px',
                                                background: 'var(--color-accent-danger)',
                                                color: 'white',
                                                border: 'none'
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onNavigateToResults(date)}
                                        className="btn btn-secondary btn-sm"
                                        style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                    >
                                        {t('game.submitResults')}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: 'var(--spacing-md)'
                        }}>
                            {gamesByDate[date].flatMap(game => game.groups).map((group, index) => {
                                const isUserGroup = group.players.some(player => player.id === effectiveUserId);

                                return (
                                    <div
                                        key={group.id}
                                        style={{
                                            padding: 'var(--spacing-md)',
                                            background: isUserGroup ? 'rgba(34, 197, 94, 0.05)' : 'var(--color-bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: isUserGroup ? '2px solid var(--color-accent-success)' : '1px solid var(--color-border-light)',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 'var(--spacing-sm)'
                                        }}>
                                            <h4 style={{
                                                margin: 0,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text-primary)'
                                            }}>
                                                {t('game.group')} {index + 1}
                                            </h4>
                                            {isUserGroup && (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    background: 'var(--color-accent-success)',
                                                    color: 'white',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontWeight: 600
                                                }}>
                                                    {t('game.yourGroup')}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                            {group.players.map((player) => {
                                                const isCurrentUser = player.id === effectiveUserId;
                                                return (
                                                    <div
                                                        key={player.id}
                                                        style={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: isCurrentUser ? 700 : 500,
                                                            color: 'var(--color-text-primary)'
                                                        }}
                                                    >
                                                        {'• '}{player.name}{player.emoji ? ' ' + player.emoji : ''}
                                                        {isCurrentUser && (
                                                            <span style={{
                                                                marginLeft: 'var(--spacing-sm)',
                                                                fontSize: '0.65rem',
                                                                padding: '2px 6px',
                                                                background: 'var(--color-accent-primary)',
                                                                color: 'white',
                                                                borderRadius: 'var(--radius-sm)',
                                                                textTransform: 'uppercase',
                                                                verticalAlign: 'middle'
                                                            }}>
                                                                {t('game.itsYou')}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
