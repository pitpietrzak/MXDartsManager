import React, { useState } from 'react';
import { DailyGame } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

interface GameHistoryProps {
    games: DailyGame[];
    currentPlayerId?: string;
    role: 'admin' | 'game_manager' | 'chef' | 'user' | null;
    onDelete?: (gameId: string) => Promise<void>;
    selectedMonth: string;
    availableMonths: string[];
    onMonthChange: (month: string) => void;
    isLoading?: boolean;
}

export const GameHistory: React.FC<GameHistoryProps> = ({
    games,
    currentPlayerId,
    role,
    onDelete,
    selectedMonth,
    availableMonths,
    onMonthChange,
    isLoading,
}) => {
    const { t, language } = useLanguage();
    const { preferences } = useUserPreferences();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Override currentPlayerId if highlighting is disabled
    const effectivePlayerId = preferences.highlightYourGames ? currentPlayerId : null;

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
            month: 'long',
            year: 'numeric',
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const completedGames = games.filter((g) => g.completed);

    // Group games by date
    const gamesByDate = completedGames.reduce((acc, game) => {
        if (!acc[game.date]) {
            acc[game.date] = [];
        }
        acc[game.date].push(game);
        return acc;
    }, {} as Record<string, DailyGame[]>);

    // Sort dates descending (newest first)
    const sortedDates = Object.keys(gamesByDate).sort((a, b) => b.localeCompare(a));

    const currentMonthFormatted = formatMonth(selectedMonth);

    return (
        <div className="card fade-in">
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                    <div>
                        <h3 className="card-title">{t('history.title')}</h3>
                        <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                            {t('history.description')} <strong>{currentMonthFormatted}</strong>
                        </p>
                    </div>
                    {/* Month selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <label
                            htmlFor="history-month-select"
                            style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
                        >
                            {t('common.selectMonth')}:
                        </label>
                        <select
                            id="history-month-select"
                            value={selectedMonth}
                            onChange={(e) => onMonthChange(e.target.value)}
                            style={{
                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                            }}
                        >
                            {availableMonths.map((m) => (
                                <option key={m} value={m}>
                                    {formatMonth(m)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    {t('common.loading')}
                </p>
            ) : completedGames.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    {t('history.noGamesMonth')} {currentMonthFormatted}
                </p>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {sortedDates.map((date) => {
                        const gamesOnDate = gamesByDate[date];
                        const totalGroups = gamesOnDate.reduce((sum, game) => sum + game.groups.length, 0);
                        const isToday = date === new Date().toISOString().split('T')[0];

                        return (
                            <div
                                key={date}
                                style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: isToday
                                        ? '2px solid var(--color-accent-primary)'
                                        : '1px solid var(--color-border-light)',
                                }}
                            >
                                <div className="flex items-center justify-between mb-md">
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '1.125rem',
                                                fontWeight: 600,
                                                marginBottom: 'var(--spacing-xs)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-sm)',
                                            }}
                                        >
                                            {formatDate(date)}
                                            {isToday && (
                                                <span
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        padding: '2px 8px',
                                                        background: 'var(--color-accent-primary)',
                                                        color: 'white',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {t('common.today')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                            {totalGroups} {totalGroups === 1 ? t('common.group') : t('common.groups')}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    {gamesOnDate.map((game, gameIdx) => {
                                        const gameStartGroupIndex = gamesOnDate
                                            .slice(0, gameIdx)
                                            .reduce((sum, g) => sum + g.groups.length, 0);

                                        return (
                                            <div key={game.id} style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                                {role === 'admin' && onDelete && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'flex-end',
                                                            marginBottom: 'var(--spacing-xs)',
                                                        }}
                                                    >
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm(t('history.deleteConfirmation'))) {
                                                                    setDeletingId(game.id);
                                                                    await onDelete(game.id);
                                                                    setDeletingId(null);
                                                                }
                                                            }}
                                                            disabled={deletingId === game.id}
                                                            className="btn btn-secondary"
                                                            style={{
                                                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                                                fontSize: '0.875rem',
                                                                minWidth: 'auto',
                                                            }}
                                                            title={`${t('common.deleteHint')}`}
                                                        >
                                                            {deletingId === game.id ? '⏳' : '🗑️'}
                                                        </button>
                                                    </div>
                                                )}

                                                {game.groups.map((group, groupIndex) => {
                                                    const globalGroupIndex = gameStartGroupIndex + groupIndex + 1;
                                                    return (
                                                        <div
                                                            key={`${game.id}-${group.id}`}
                                                            style={{
                                                                padding: 'var(--spacing-sm)',
                                                                background: 'var(--color-bg-tertiary)',
                                                                borderRadius: 'var(--radius-md)',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    fontWeight: 600,
                                                                    marginBottom: 'var(--spacing-xs)',
                                                                    fontSize: '0.875rem',
                                                                    color: 'var(--color-text-muted)',
                                                                }}
                                                            >
                                                                {t('common.group')} {globalGroupIndex}
                                                            </div>
                                                            {group.results && (
                                                                <div style={{ fontSize: '0.875rem' }}>
                                                                    {[...group.results]
                                                                        .sort((a, b) => a.position - b.position)
                                                                        .map((result) => {
                                                                            const player = group.players.find(
                                                                                (p) => p.id === result.playerId
                                                                            );
                                                                            let emoji = '';
                                                                            if (result.position === 1) emoji = '🥇';
                                                                            else if (result.position === 2) emoji = '🥈';
                                                                            else if (result.position === 3) emoji = '🥉';
                                                                            else emoji = `${result.position}.`;
                                                                            return (
                                                                                <div
                                                                                    key={result.playerId}
                                                                                    style={{ padding: 'var(--spacing-xs) 0' }}
                                                                                >
                                                                                    {emoji}{' '}
                                                                                    <span
                                                                                        style={{
                                                                                            fontWeight:
                                                                                                player?.id === effectivePlayerId ? 700 : 400,
                                                                                            color:
                                                                                                player?.id === effectivePlayerId
                                                                                                    ? 'var(--color-accent-primary)'
                                                                                                    : 'inherit',
                                                                                        }}
                                                                                    >
                                                                                        {player?.name}
                                                                                    </span>
                                                                                    :{' '}
                                                                                    <span
                                                                                        style={{
                                                                                            fontWeight:
                                                                                                player?.id === effectivePlayerId ? 700 : 400,
                                                                                            color:
                                                                                                player?.id === effectivePlayerId
                                                                                                    ? 'var(--color-accent-primary)'
                                                                                                    : 'var(--color-text-muted)',
                                                                                        }}
                                                                                    >
                                                                                        {result.wins}-{result.losses}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
