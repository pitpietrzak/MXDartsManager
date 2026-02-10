import React from 'react';
import { Player, Group } from '../types/types';
import { generateGroups } from '../utils/groupGenerator';

interface GroupDrawerProps {
    presentPlayers: Player[];
    groups: Group[];
    onGroupsGenerated: (groups: Group[]) => void;
}

export const GroupDrawer: React.FC<GroupDrawerProps> = ({
    presentPlayers,
    groups,
    onGroupsGenerated
}) => {
    const [numberOfGroups, setNumberOfGroups] = React.useState<number>(1);

    const handleDrawGroups = () => {
        if (presentPlayers.length < 2) {
            return;
        }

        const playerGroups = generateGroups(presentPlayers, numberOfGroups);
        const newGroups: Group[] = playerGroups.map((players, index) => ({
            id: `group-${Date.now()}-${index}`,
            players,
            results: undefined
        }));

        onGroupsGenerated(newGroups);
    };

    const canDraw = presentPlayers.length >= 2;

    // Calculate expected group sizes for preview
    const getGroupSizePreview = () => {
        if (presentPlayers.length === 0) return '';
        const actualGroupCount = Math.min(numberOfGroups, presentPlayers.length);
        const baseSize = Math.floor(presentPlayers.length / actualGroupCount);
        const remainder = presentPlayers.length % actualGroupCount;

        if (remainder === 0) {
            return `${actualGroupCount} group${actualGroupCount > 1 ? 's' : ''} of ${baseSize} players`;
        } else {
            return `${remainder} group${remainder > 1 ? 's' : ''} of ${baseSize + 1}, ${actualGroupCount - remainder} group${actualGroupCount - remainder > 1 ? 's' : ''} of ${baseSize}`;
        }
    };

    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">Draw Groups</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    Randomly generate groups from selected players
                </p>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
                    Number of Groups
                </label>
                <div className="flex gap-sm">
                    {[1, 2, 3].map((count) => (
                        <label
                            key={count}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 'var(--spacing-sm)',
                                background: numberOfGroups === count ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                                color: numberOfGroups === count ? 'white' : 'var(--color-text-primary)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                border: '2px solid',
                                borderColor: numberOfGroups === count ? 'var(--color-accent-primary)' : 'var(--color-border-light)',
                                transition: 'all 0.2s ease',
                                fontSize: '0.875rem',
                                fontWeight: 600
                            }}
                        >
                            <input
                                type="radio"
                                name="groupCount"
                                value={count}
                                checked={numberOfGroups === count}
                                onChange={() => setNumberOfGroups(count)}
                                style={{ display: 'none' }}
                            />
                            {count}
                        </label>
                    ))}
                </div>
                {presentPlayers.length > 0 && (
                    <p className="text-muted" style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: '0.75rem' }}>
                        {getGroupSizePreview()}
                    </p>
                )}
            </div>

            <button
                onClick={handleDrawGroups}
                disabled={!canDraw}
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
            >
                🎯 Draw Groups ({presentPlayers.length} players)
            </button>

            {!canDraw && (
                <p className="text-muted text-center mt-md">
                    Select at least 2 players to draw groups
                </p>
            )}

            {groups.length > 0 && (
                <div className="mt-lg">
                    <div className="flex items-center justify-between mb-md">
                        <h4 style={{ fontSize: '1rem', margin: 0 }}>Generated Groups</h4>
                        <button onClick={handleDrawGroups} className="btn btn-secondary btn-sm">
                            🔄 Re-draw
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        {groups.map((group, groupIndex) => (
                            <div
                                key={group.id}
                                style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '2px solid var(--color-border-light)'
                                }}
                            >
                                <div className="flex items-center justify-between mb-sm">
                                    <h5 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--color-accent-primary)' }}>
                                        GROUP {groupIndex + 1}
                                    </h5>
                                    <span className="badge badge-primary">
                                        {group.players.length} players
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                    {group.players.map((player, playerIndex) => (
                                        <div
                                            key={player.id}
                                            style={{
                                                padding: 'var(--spacing-sm)',
                                                background: 'var(--color-bg-tertiary)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: '0.875rem',
                                                fontWeight: 500
                                            }}
                                        >
                                            {playerIndex + 1}. {player.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
