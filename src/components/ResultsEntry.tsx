import React, { useState } from 'react';
import { Group, GameResult } from '../types/types';
import { calculateWinsLosses } from '../utils/groupGenerator';

interface ResultsEntryProps {
    groups: Group[];
    onResultsSubmit: (groups: Group[]) => void;
}

export const ResultsEntry: React.FC<ResultsEntryProps> = ({
    groups,
    onResultsSubmit
}) => {
    const [groupResults, setGroupResults] = useState<Map<string, GameResult[]>>(new Map());

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

        // Check if position is already taken by another player
        const positionTaken = currentResults.some(r => r.playerId !== playerId && r.position === position);
        if (positionTaken) {
            // Position already assigned to another player in this group
            return;
        }

        // Remove any existing result for this player
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
                    <h3 className="card-title">Enter Results</h3>
                </div>
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    Draw groups first to enter results
                </p>
            </div>
        );
    }

    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">Enter Results</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    Rank players by their finishing position in each group
                </p>
            </div>

            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                {groups.map((group, groupIndex) => {
                    const results = groupResults.get(group.id) || [];
                    const isComplete = isGroupComplete(group.id);

                    return (
                        <div
                            key={group.id}
                            style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-lg)',
                                border: isComplete ? '2px solid var(--color-accent-success)' : '2px solid var(--color-border-light)'
                            }}
                        >
                            <div className="flex items-center justify-between mb-md">
                                <h4 style={{ fontSize: '1rem', margin: 0 }}>
                                    Group {groupIndex + 1}
                                </h4>
                                {isComplete && (
                                    <span className="badge badge-success">✓ Complete</span>
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
                                                borderRadius: 'var(--radius-md)'
                                            }}
                                        >
                                            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                {player.name}
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
                                <div className="mt-sm" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    Results: {results.sort((a, b) => a.position - b.position).map(r => {
                                        const player = group.players.find(p => p.id === r.playerId);
                                        return `${player?.name}: ${r.wins}-${r.losses}`;
                                    }).join(' • ')}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button
                onClick={handleSubmit}
                disabled={!allGroupsComplete}
                className="btn btn-success btn-lg mt-lg"
                style={{ width: '100%' }}
            >
                {allGroupsComplete ? '✓ Submit Results' : `Complete all groups (${groups.filter(g => isGroupComplete(g.id)).length}/${groups.length})`}
            </button>
        </div>
    );
};
