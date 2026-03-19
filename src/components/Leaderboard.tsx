import React from 'react';
import { MonthlyStats, Player } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

interface LeaderboardProps {
    stats: MonthlyStats[];
    currentMonth: string;
    currentPlayerId?: string;
    players?: Player[];
    selectedMonth?: string;
    availableMonths?: string[];
    onMonthChange?: (month: string) => void;
    isLoading?: boolean;
    darterOfLastMonthId?: string;
    darterOfLastMonthString?: string;
    onPrintClick?: () => void;
    isPublicView?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
    stats,
    currentMonth,
    currentPlayerId,
    players,
    selectedMonth,
    availableMonths,
    onMonthChange,
    isLoading,
    darterOfLastMonthId,
    darterOfLastMonthString,
    onPrintClick,
    isPublicView,
}) => {
    const { t, language } = useLanguage();
    const { preferences } = useUserPreferences();
    const sortedStats = [...stats].sort((a, b) => b.rating - a.rating);

    // Override currentPlayerId if highlighting is disabled
    const effectivePlayerId = preferences.highlightYourGames ? currentPlayerId : null;
    const isCurrentMonth = currentMonth === new Date().toISOString().slice(0, 7);

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
            month: 'long',
            year: 'numeric',
        });
    };

    const getRankEmoji = (rank: number) => {
        if (!isPublicView) {
            if (rank === 1) return '🥇';
            if (rank === 2) return '🥈';
            if (rank === 3) return '🥉';
        }
        return `${rank}`;
    };

    const getWinRate = (wins: number, losses: number) => {
        const total = wins + losses;
        if (total === 0) return '0%';
        return `${Math.round((wins / total) * 100)}%`;
    };

    const effectiveSelectedMonth = selectedMonth ?? currentMonth;
    const stripEmojis = (str: string) => str.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
    const selectedMonthFormatted = formatMonth(effectiveSelectedMonth);
    const displayTitle = isPublicView ? stripEmojis(t('leaderboard.title')) : t('leaderboard.title');

    return (
        <div className={`card fade-in ${isPublicView ? 'public-view-card' : ''}`}>
            {isPublicView && (
                <style>{`
                    .public-view-card {
                        background: #ffffff !important;
                        padding: 0 var(--spacing-md) !important;
                        height: 100vh !important;
                        width: 100vw !important;
                        display: flex !important;
                        flex-direction: column !important;
                        border: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        max-width: none !important;
                        overflow: hidden !important;
                    }
                    .public-view-table-container {
                        flex: 1 !important;
                        min-height: 0 !important;
                        width: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                    }
                    .public-view-table {
                        width: 100% !important;
                        height: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: fixed !important;
                        color: #0f172a !important;
                    }
                    .public-view-table th {
                        font-size: 0.9rem !important;
                        padding: 8px var(--spacing-md) !important;
                        color: #475569 !important;
                        border-bottom: 2px solid #e2e8f0 !important;
                        text-align: center !important;
                        text-transform: uppercase !important;
                        background: #f8fafc !important;
                    }
                    .public-view-table td {
                        padding: 4px var(--spacing-md) !important;
                        vertical-align: middle !important;
                        text-align: center !important;
                        border-bottom: 1px solid #f1f5f9 !important;
                        font-weight: 600 !important;
                        font-size: 1.25rem !important;
                        color: #0f172a !important;
                    }
                    .rank-1-row {
                        background-color: #fff9db !important;
                        border-left: 8px solid #f59e0b !important;
                    }
                    .rank-2-row {
                        background-color: #f1f5f9 !important;
                        border-left: 8px solid #94a3b8 !important;
                    }
                    .rank-3-row {
                        background-color: #fff4e6 !important;
                        border-left: 8px solid #d97706 !important;
                    }
                    .public-view-table th:nth-child(-n+2), 
                    .public-view-table td:nth-child(-n+2) {
                        text-align: left !important;
                        padding-left: var(--spacing-xl) !important;
                    }
                    .public-view-title {
                        font-size: 1.8rem !important;
                        color: #1e293b !important;
                        text-align: left !important;
                        margin: 10px 0 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 2px !important;
                        font-weight: 900 !important;
                    }
                    /* Ensure container takes full height in App.tsx */
                    html, body, #root {
                        height: 100% !important;
                        overflow: hidden !important;
                    }
                `}</style>
            )}
            <div className="card-header" style={isPublicView ? { borderBottom: 'none', marginBottom: 0, padding: 0 } : {}}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 var(--spacing-md)' }}>
                    <div>
                        <h3 className={isPublicView ? 'public-view-title' : 'card-title'}>{displayTitle}</h3>
                        {!isPublicView && (
                            <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                                {t('leaderboard.description')} <strong>{selectedMonthFormatted}</strong>
                            </p>
                        )}
                    </div>
                    {/* Actions & Month selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        {onPrintClick && !isPublicView && (
                            <button
                                onClick={onPrintClick}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                                title={t('print.title')}
                            >
                                🖨️ <span className="hide-mobile">{t('print.title')}</span>
                            </button>
                        )}
                        {availableMonths && onMonthChange && !isPublicView && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <label
                                    htmlFor="leaderboard-month-select"
                                    style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
                                >
                                    {t('common.selectMonth')}:
                                </label>
                                <select
                                    id="leaderboard-month-select"
                                    value={effectiveSelectedMonth}
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
                        )}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    {t('common.loading')}
                </p>
            ) : sortedStats.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    {t('history.noGamesMonth')} {selectedMonthFormatted}
                </p>
            ) : (
                <>
                    {/* Darter of the Month */}
                    {sortedStats.length > 0 && sortedStats[0].gamesPlayed > 0 && !isPublicView && (
                        <div
                            style={{
                                padding: 'var(--spacing-lg)',
                                background: 'var(--gradient-primary)',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: 'var(--spacing-lg)',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-sm)' }}>👑</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.9, marginBottom: 'var(--spacing-xs)' }}>
                                {t(isCurrentMonth ? 'leaderboard.currentLeader' : 'leaderboard.darterOfMonth')}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{sortedStats[0].playerName}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.9, marginTop: 'var(--spacing-xs)' }}>
                                {t('leaderboard.rating')}: {sortedStats[0].rating.toFixed(3)}
                            </div>
                        </div>
                    )}

                    {/* Rankings Table */}
                    <div className={isPublicView ? 'public-view-table-container' : ''} style={{ overflowX: 'auto' }}>
                        <table className={isPublicView ? 'public-view-table' : ''} style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                                            className={isPublicView ? (index === 0 ? 'rank-1-row' : index === 1 ? 'rank-2-row' : index === 2 ? 'rank-3-row' : '') : ''}
                                            style={{
                                                borderBottom: '1px solid var(--color-border)',
                                                background: isPublicView 
                                                    ? '' 
                                                    : (isCurrentPlayer
                                                        ? 'rgba(34, 197, 94, 0.15)'
                                                        : index < 3
                                                            ? 'rgba(245, 158, 11, 0.05)'
                                                            : 'transparent'),
                                                transition: 'background var(--transition-fast)',
                                            }}
                                        >
                                            <td style={{ padding: 'var(--spacing-md)', fontSize: '1rem', fontWeight: 700 }}>
                                                {getRankEmoji(index + 1)}
                                            </td>
                                            <td style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>
                                                {stat.playerName} {!isPublicView && (players?.find((p) => p.id === stat.playerId)?.emoji || '')}
                                                {darterOfLastMonthId && stat.playerId === darterOfLastMonthId && (
                                                    <span
                                                        title={t('leaderboard.darterOfMonth')}
                                                        style={{
                                                            marginLeft: 'var(--spacing-sm)',
                                                            fontSize: '0.65rem',
                                                            padding: '2px 7px',
                                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                            color: 'white',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontWeight: 700,
                                                            verticalAlign: 'middle',
                                                            letterSpacing: '0.03em',
                                                            boxShadow: '0 1px 4px rgba(245,158,11,0.4)',
                                                        }}
                                                    >
                                                        {!isPublicView ? '👑 ' : ''}{darterOfLastMonthString ? formatMonth(darterOfLastMonthString) : t('common.lastMonth')}
                                                    </span>
                                                )}
                                                {isCurrentPlayer && (
                                                    <span
                                                        style={{
                                                            marginLeft: 'var(--spacing-sm)',
                                                            fontSize: '0.65rem',
                                                            padding: '2px 6px',
                                                            background: 'var(--color-accent-primary)',
                                                            color: 'white',
                                                            borderRadius: 'var(--radius-sm)',
                                                            textTransform: 'uppercase',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
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
