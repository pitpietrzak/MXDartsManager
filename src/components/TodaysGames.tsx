import React from 'react';
import { DailyGame, Group } from '../types/types';

interface TodaysGamesProps {
    game: DailyGame | null;
    currentUserId: string | null;
    role: 'admin' | 'game_manager' | 'user' | null;
    onNavigateToResults?: () => void;
}

export const TodaysGames: React.FC<TodaysGamesProps> = ({
    game,
    currentUserId,
    role,
    onNavigateToResults
}) => {
    if (!game || game.groups.length === 0) {
        return (
            <div className="card fade-in">
                <div className="card-header">
                    <h3 className="card-title">🎯 Today's Games</h3>
                </div>
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    No games scheduled for today
                </p>
            </div>
        );
    }

    // Find which group the current user is in
    const userGroupIndex = game.groups.findIndex(group =>
        group.players.some(player => player.id === currentUserId)
    );

    return (
        <div className="card fade-in" style={{
            border: '2px solid var(--color-accent-primary)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                    <div>
                        <h3 className="card-title">🎯 Today's Games</h3>
                        <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                            {game.groups.length} {game.groups.length === 1 ? 'group' : 'groups'} scheduled
                        </p>
                    </div>
                    {(role === 'admin' || role === 'game_manager') && onNavigateToResults && (
                        <button
                            onClick={onNavigateToResults}
                            className="btn btn-primary"
                            style={{ fontSize: '0.875rem' }}
                        >
                            📝 Submit Results
                        </button>
                    )}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md)'
            }}>
                {game.groups.map((group: Group, index: number) => {
                    const isUserGroup = index === userGroupIndex;

                    return (
                        <div
                            key={group.id}
                            style={{
                                padding: 'var(--spacing-md)',
                                background: isUserGroup ? 'var(--color-accent-success)' : 'var(--color-bg-tertiary)',
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
                                    color: isUserGroup ? 'white' : 'var(--color-text-primary)'
                                }}>
                                    Group {index + 1}
                                </h4>
                                {isUserGroup && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 8px',
                                        background: 'white',
                                        color: 'var(--color-accent-success)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 600
                                    }}>
                                        ⭐ Your Group
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                {group.players.map((player) => {
                                    const isCurrentUser = player.id === currentUserId;
                                    return (
                                        <div
                                            key={player.id}
                                            style={{
                                                padding: 'var(--spacing-xs)',
                                                background: isUserGroup ? 'rgba(255, 255, 255, 0.2)' : 'var(--color-bg-secondary)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.875rem',
                                                fontWeight: isCurrentUser ? 600 : 400,
                                                color: isUserGroup ? 'white' : 'var(--color-text-primary)'
                                            }}
                                        >
                                            {isCurrentUser ? '👤 ' : '• '}{player.name}
                                            {isCurrentUser && ' (You)'}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
