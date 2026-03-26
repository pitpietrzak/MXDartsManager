import React, { useState } from 'react';
import { Group, GameResult } from '../types/types';
import { calculateWinsLosses } from '../utils/groupGenerator';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

interface ResultsEntryProps {
    groups: Group[];
    onResultsSubmit: (groups: Group[]) => void;
    onGroupSubmit?: (groupId: string, results: GameResult[]) => Promise<void>;
    currentUserId?: string;
    date?: string;
}

export const ResultsEntry: React.FC<ResultsEntryProps> = ({
    groups,
    onResultsSubmit,
    onGroupSubmit,
    currentUserId,
    date
}) => {
    const { t, language } = useLanguage();
    const { preferences } = useUserPreferences();
    const [groupResults, setGroupResults] = useState<Map<string, GameResult[]>>(new Map());

    // Format date for display
    const formattedDate = date ? new Date(date).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }) : null;

    // Override currentUserId if highlighting is disabled
    const effectiveUserId = preferences.highlightYourGames ? currentUserId : null;

    // Initialize state from props
    React.useEffect(() => {
        const initialMap = new Map<string, GameResult[]>();
        groups.forEach(group => {
            if (group.results && group.results.length > 0) {
                // Only load valid results (position > 0)
                const validResults = group.results.filter(r => r.position > 0);
                if (validResults.length > 0) {
                    initialMap.set(group.id, validResults);
                }
            }
        });
        setGroupResults(initialMap);
    }, [groups]);

    // Helper function to get position label
    const getPositionLabel = (position: number): string => {
        if (position === 1) return '🥇';
        if (position === 2) return '🥈';
        if (position === 3) return '🥉';
        return `${position}th`;
    };

    const handlePositionChange = (groupId: string, playerId: string, position: number) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const currentResults = groupResults.get(groupId) || [];

        // Check if player is already selected at this position (Unselect)
        const currentResult = currentResults.find(r => r.playerId === playerId);
        if (currentResult && currentResult.position === position) {
            const userId = playerId; // just for clarity
            const updatedResults = currentResults.filter(r => r.playerId !== userId);
            const newMap = new Map(groupResults);
            newMap.set(groupId, updatedResults);
            setGroupResults(newMap);
            return;
        }

        // Check if position is already taken by another player
        const positionTaken = currentResults.some(r => r.playerId !== playerId && r.position === position);
        if (positionTaken) {
            // Position already assigned to another player in this group
            return;
        }

        // Remove any existing result for this player (change position)
        const filteredResults = currentResults.filter(r => r.playerId !== playerId);

        // Calculate wins/losses based on position and group size
        const { wins, losses } = calculateWinsLosses(position, group.players.length);

        // Add new result
        const newResult: GameResult = {
            playerId,
            wins,
            losses,
            position
        };

        const updatedResults = [...filteredResults, newResult];
        const newMap = new Map(groupResults);
        newMap.set(groupId, updatedResults);
        setGroupResults(newMap);
    };

    const isGroupComplete = (groupId: string): boolean => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return false;

        const results = groupResults.get(groupId) || [];
        return results.length === group.players.length;
    };

    const allGroupsComplete = groups.every(g => isGroupComplete(g.id));

    const handleSubmit = () => {
        if (!allGroupsComplete) return;

        const updatedGroups = groups.map(group => ({
            ...group,
            results: groupResults.get(group.id) || []
        }));

        onResultsSubmit(updatedGroups);
    };

    if (groups.length === 0) {
        return (
            <div className="card fade-in">
                <div className="card-header">
                    <h3 className="card-title">{t('results.title')}</h3>
                </div>
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    {t('results.drawFirst')}
                </p>
            </div>
        );
    }

    return (
        <div className="card fade-in">
            <div className="card-header">
                <div>
                    <h3 className="card-title">{t('results.title')}</h3>
                    {formattedDate && (
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '0.9rem',
                            color: 'var(--color-accent-primary)',
                            fontWeight: 600
                        }}>
                            📅 {formattedDate}
                        </p>
                    )}
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    {t('results.instruction')}
                </p>
            </div>

            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                {groups.map((group, groupIndex) => {
                    const results = groupResults.get(group.id) || [];
                    const isComplete = isGroupComplete(group.id);
                    const isUserGroup = effectiveUserId ? group.players.some(p => p.id === effectiveUserId) : false;

                    return (
                        <div
                            key={group.id}
                            style={{
                                padding: 'var(--spacing-md)',
                                background: isUserGroup ? 'rgba(34, 197, 94, 0.05)' : 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-lg)',
                                border: isUserGroup ? '2px solid var(--color-accent-success)' : (isComplete ? '2px solid var(--color-accent-success)' : '2px solid var(--color-border-light)'),
                                position: 'relative'
                            }}
                        >
                            <div className="flex items-center justify-between mb-md">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                    <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        {t('game.group')} {groupIndex + 1}
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
                                {isComplete && (
                                    <span className="badge badge-success">{t('results.complete')}</span>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                {group.players.map((player) => {
                                    const result = results.find(r => r.playerId === player.id);

                                    return (
                                        <div
                                            key={player.id}
                                            className="flex items-center justify-between"
                                            style={{
                                                padding: 'var(--spacing-sm)',
                                                background: 'var(--color-bg-tertiary)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--color-border-light)'
                                            }}
                                        >
                                            <span style={{ fontWeight: player.id === effectiveUserId ? 700 : 500, fontSize: '0.875rem' }}>
                                                {player.name} {player.emoji}
                                                {player.id === effectiveUserId && (
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
                                            </span>
                                            <div className="flex gap-sm" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                {Array.from({ length: group.players.length }, (_, i) => i + 1).map((pos) => {
                                                    const isPositionTaken = results.some(r => r.playerId !== player.id && r.position === pos);
                                                    const isSelected = result?.position === pos;

                                                    return (
                                                        <button
                                                            key={pos}
                                                            onClick={() => handlePositionChange(group.id, player.id, pos)}
                                                            disabled={isPositionTaken}
                                                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                                            style={{
                                                                minWidth: '2.5rem',
                                                                opacity: isPositionTaken && !isSelected ? 0.4 : 1,
                                                                cursor: isPositionTaken && !isSelected ? 'not-allowed' : 'pointer'
                                                            }}
                                                        >
                                                            {getPositionLabel(pos)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {isComplete && (
                                <div className="mt-sm">
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                                        {t('game.results')}: {results.sort((a, b) => a.position - b.position).map(r => {
                                            const player = group.players.find(p => p.id === r.playerId);
                                            return `${player?.name}: ${r.wins}-${r.losses}`;
                                        }).join(' • ')}
                                    </div>

                                    {onGroupSubmit && (
                                        <button
                                            onClick={() => onGroupSubmit(group.id, results)}
                                            className="btn btn-success btn-sm"
                                            style={{ width: '100%' }}
                                        >
                                            {t('game.confirmGroup')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!onGroupSubmit && (
                <button
                    onClick={handleSubmit}
                    disabled={!allGroupsComplete}
                    className="btn btn-success btn-lg mt-lg"
                    style={{ width: '100%' }}
                >
                    {allGroupsComplete ? t('game.submitResults') : `${t('game.completeAllGroups')} (${groups.filter(g => isGroupComplete(g.id)).length}/${groups.length})`}
                </button>
            )}
        </div>
    );
};
