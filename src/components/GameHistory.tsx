import React, { useState } from 'react';
import { DailyGame } from '../types/types';

interface GameHistoryProps {
    games: DailyGame[];
    currentMonth: string;
    role: 'admin' | 'game_manager' | 'user' | null;
    onDelete?: (gameId: string) => Promise<void>;
}

export const GameHistory: React.FC<GameHistoryProps> = ({ games, role, onDelete }) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const completedGames = games.filter(g => g.completed);

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

    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">📅 Game History</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    All completed games this month
                </p>
            </div>

            {completedGames.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    No games completed yet this month
                </p>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {sortedDates.map((date) => {
                        const gamesOnDate = gamesByDate[date];
                        const totalGroups = gamesOnDate.reduce((sum, game) => sum + game.groups.length, 0);

                        return (
                            <div
                                key={date}
                                style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--color-border-light)'
                                }}
                            >
                                <div className="flex items-center justify-between mb-md">
                                    <div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                            {formatDate(date)}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                            {totalGroups} {totalGroups === 1 ? 'group' : 'groups'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                        {role === 'admin' && onDelete && gamesOnDate.map((game) => (
                                            <button
                                                key={game.id}
                                                onClick={async () => {
                                                    if (window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
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
                                                    minWidth: 'auto'
                                                }}
                                                title="Delete game"
                                            >
                                                {deletingId === game.id ? '⏳' : '🗑️'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    {gamesOnDate.flatMap((game, gameIdx) =>
                                        game.groups.map((group, groupIndex) => {
                                            const globalGroupIndex = gamesOnDate.slice(0, gameIdx).reduce((sum, g) => sum + g.groups.length, 0) + groupIndex + 1;
                                            return (
                                                <div
                                                    key={`${game.id}-${group.id}`}
                                                    style={{
                                                        padding: 'var(--spacing-sm)',
                                                        background: 'var(--color-bg-tertiary)',
                                                        borderRadius: 'var(--radius-md)'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                                        Group {globalGroupIndex}
                                                    </div>
                                                    {group.results && (
                                                        <div style={{ fontSize: '0.875rem' }}>
                                                            {[...group.results]
                                                                .sort((a, b) => a.position - b.position)
                                                                .map((result) => {
                                                                    const player = group.players.find(p => p.id === result.playerId);
                                                                    let emoji = '';
                                                                    if (result.position === 1) emoji = '🥇';
                                                                    else if (result.position === 2) emoji = '🥈';
                                                                    else if (result.position === 3) emoji = '🥉';
                                                                    else emoji = `${result.position}.`;
                                                                    return (
                                                                        <div key={result.playerId} style={{ padding: 'var(--spacing-xs) 0' }}>
                                                                            {emoji} {player?.name}: <span style={{ color: 'var(--color-text-muted)' }}>{result.wins}-{result.losses}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
