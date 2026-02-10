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

    const completedGames = games.filter(g => g.completed).reverse();

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
                    {completedGames.map((game) => (
                        <div
                            key={game.id}
                            style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border-light)'
                            }}
                        >
                            <div className="flex items-center justify-between mb-md">
                                <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 600 }}>
                                    {formatDate(game.date)}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                    <span className="badge badge-success">
                                        {game.groups.length} {game.groups.length === 1 ? 'group' : 'groups'}
                                    </span>
                                    {role === 'admin' && onDelete && (
                                        <button
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
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                {game.groups.map((group, groupIndex) => (
                                    <div
                                        key={group.id}
                                        style={{
                                            padding: 'var(--spacing-sm)',
                                            background: 'var(--color-bg-tertiary)',
                                            borderRadius: 'var(--radius-md)'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-xs)' }}>
                                            GROUP {groupIndex + 1}
                                        </div>
                                        {group.results && (
                                            <div style={{ fontSize: '0.875rem' }}>
                                                {[...group.results]
                                                    .sort((a, b) => a.position - b.position)
                                                    .map((result) => {
                                                        const player = group.players.find(p => p.id === result.playerId);
                                                        const emoji = result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : '4️⃣';
                                                        return (
                                                            <div key={result.playerId} style={{ padding: 'var(--spacing-xs) 0' }}>
                                                                {emoji} {player?.name}: <span style={{ color: 'var(--color-text-muted)' }}>{result.wins}-{result.losses}</span>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
