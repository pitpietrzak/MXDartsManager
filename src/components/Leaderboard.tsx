import React from 'react';
import { MonthlyStats } from '../types/types';

interface LeaderboardProps {
    stats: MonthlyStats[];
    currentMonth: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ stats, currentMonth }) => {
    const sortedStats = [...stats].sort((a, b) => b.rating - a.rating);

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const getRankEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}`;
    };

    const getWinRate = (wins: number, losses: number) => {
        const total = wins + losses;
        if (total === 0) return '0%';
        return `${Math.round((wins / total) * 100)}%`;
    };

    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">🎯 Leaderboard</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    {formatMonth(currentMonth)} Rankings
                </p>
            </div>

            {sortedStats.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    No games played yet this month. Start playing to see rankings!
                </p>
            ) : (
                <>
                    {/* Darter of the Month */}
                    {sortedStats.length > 0 && sortedStats[0].gamesPlayed > 0 && (
                        <div
                            style={{
                                padding: 'var(--spacing-lg)',
                                background: 'var(--gradient-primary)',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: 'var(--spacing-lg)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-sm)' }}>👑</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9, marginBottom: 'var(--spacing-xs)' }}>
                                DARTER OF THE MONTH
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                                {sortedStats[0].playerName}
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.9, marginTop: 'var(--spacing-xs)' }}>
                                Rating: {sortedStats[0].rating.toFixed(3)}
                            </div>
                        </div>
                    )}

                    {/* Rankings Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        RANK
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        PLAYER
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        RATING
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        W-L
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        WIN%
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        GAMES
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStats.map((stat, index) => (
                                    <tr
                                        key={stat.playerId}
                                        style={{
                                            borderBottom: '1px solid var(--color-border)',
                                            background: index < 3 ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                                            transition: 'background var(--transition-fast)'
                                        }}
                                    >
                                        <td style={{ padding: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 700 }}>
                                            {getRankEmoji(index + 1)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>
                                            {stat.playerName}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', textAlign: 'center', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                            {stat.rating.toFixed(3)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', textAlign: 'center', fontSize: '0.875rem' }}>
                                            {stat.totalWins}-{stat.totalLosses}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', textAlign: 'center', fontSize: '0.875rem' }}>
                                            {getWinRate(stat.totalWins, stat.totalLosses)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-md)', textAlign: 'center', fontSize: '0.875rem' }}>
                                            {stat.gamesPlayed}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};
