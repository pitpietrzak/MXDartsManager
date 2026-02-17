import React from 'react';
import { MonthlyStats, Player } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

interface LeaderboardProps {
    stats: MonthlyStats[];
    currentMonth: string;
    currentPlayerId?: string;
    players?: Player[]; // Optional for backward compatibility, but recommended
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ stats, currentMonth, currentPlayerId, players }) => {
    const { t, language } = useLanguage();
    const { preferences } = useUserPreferences();
    const sortedStats = [...stats].sort((a, b) => b.rating - a.rating);

    // Override currentPlayerId if highlighting is disabled
    const effectivePlayerId = preferences.highlightYourGames ? currentPlayerId : null;
    const isCurrentMonth = currentMonth === new Date().toISOString().slice(0, 7);

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { month: 'long', year: 'numeric' });
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
                <h3 className="card-title">{t('leaderboard.title')}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    {t('leaderboard.description')} ({formatMonth(currentMonth)})
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
                                {t(isCurrentMonth ? 'leaderboard.currentLeader' : 'leaderboard.darterOfMonth')}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                                {sortedStats[0].playerName}
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.9, marginTop: 'var(--spacing-xs)' }}>
                                {t('leaderboard.rating')}: {sortedStats[0].rating.toFixed(3)}
                            </div>
                        </div>
                    )}

                    {/* Rankings Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        {t('leaderboard.rank').toUpperCase()}
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        {t('leaderboard.player').toUpperCase()}
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        {t('leaderboard.rating').toUpperCase()}
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        {t('leaderboard.winLoss').toUpperCase()}
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        WIN%
                                    </th>
                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                        {t('leaderboard.matches').toUpperCase()}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStats.map((stat, index) => {
                                    const isCurrentPlayer = effectivePlayerId && stat.playerId === effectivePlayerId;
                                    return (
                                        <tr
                                            key={stat.playerId}
                                            style={{
                                                borderBottom: '1px solid var(--color-border)',
                                                background: isCurrentPlayer
                                                    ? 'rgba(34, 197, 94, 0.15)'
                                                    : (index < 3 ? 'rgba(245, 158, 11, 0.05)' : 'transparent'),
                                                transition: 'background var(--transition-fast)'
                                            }}
                                        >
                                            <td style={{ padding: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 700 }}>
                                                {getRankEmoji(index + 1)}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>
                                                {stat.playerName} {players?.find(p => p.id === stat.playerId)?.emoji || ''}
                                                {isCurrentPlayer && (
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};
