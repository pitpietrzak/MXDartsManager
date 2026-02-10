import React, { useState } from 'react';
import { Player, Group } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';

interface ManualGroupCreatorProps {
    presentPlayers: Player[];
    onGroupsCreated: (groups: Group[]) => void;
    initialGroups?: Group[];
}

export const ManualGroupCreator: React.FC<ManualGroupCreatorProps> = ({
    presentPlayers,
    onGroupsCreated,
    initialGroups
}) => {
    const { t } = useLanguage();
    // Deep copy initialGroups to ensure we don't mutate parent state
    const [groups, setGroups] = useState<Group[]>(() => {
        if (initialGroups) {
            return initialGroups.map(g => ({
                ...g,
                players: [...g.players]
            }));
        }
        return [{ id: `group-${Date.now()}-0`, players: [], results: undefined }];
    });

    const addGroup = () => {
        setGroups([...groups, {
            id: `group-${Date.now()}-${groups.length}`,
            players: [],
            results: undefined
        }]);
    };

    const removeGroup = (groupIndex: number) => {
        if (groups.length > 1) {
            setGroups(groups.filter((_, i) => i !== groupIndex));
        }
    };

    const addPlayerToGroup = (groupIndex: number, player: Player) => {
        // Prevent adding if already assigned to any group
        if (getAssignedPlayerIds().has(player.id)) {
            return;
        }

        const newGroups = [...groups];
        // Create a copy of the group to avoid mutating the original object in state/props
        newGroups[groupIndex] = {
            ...newGroups[groupIndex],
            players: [...newGroups[groupIndex].players]
        };

        // Check if player is already in THIS group (redundant but safe)
        if (!newGroups[groupIndex].players.find(p => p.id === player.id)) {
            newGroups[groupIndex].players.push(player);
            setGroups(newGroups);
        }
    };

    const removePlayerFromGroup = (groupIndex: number, playerId: string) => {
        const newGroups = [...groups];
        newGroups[groupIndex] = {
            ...newGroups[groupIndex],
            players: newGroups[groupIndex].players.filter(p => p.id !== playerId)
        };
        setGroups(newGroups);
    };

    const getAssignedPlayerIds = (): Set<string> => {
        const assigned = new Set<string>();
        groups.forEach(group => {
            group.players.forEach(player => assigned.add(player.id));
        });
        return assigned;
    };

    const unassignedPlayers = presentPlayers.filter(p => !getAssignedPlayerIds().has(p.id));

    // Check for players in groups who are NOT in presentPlayers
    const playersInGroups = groups.flatMap(g => g.players);
    const uniquePlayersInGroups = new Set(playersInGroups.map(p => p.id));
    const invalidPlayers = playersInGroups.filter(p => !presentPlayers.find(pp => pp.id === p.id));

    // Valid if:
    // 1. All players are assigned
    // 2. Non-empty groups have at least 2 players
    // 3. At least one valid group exists
    // 4. No duplicates across groups (checked by size mismatch)
    // 5. No players that are not "present"
    const validGroups = groups.filter(g => g.players.length > 0);
    const hasDuplicates = playersInGroups.length !== uniquePlayersInGroups.size;

    const canSave = unassignedPlayers.length === 0 &&
        validGroups.length > 0 &&
        validGroups.every(g => g.players.length >= 2) &&
        !hasDuplicates &&
        invalidPlayers.length === 0;

    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">{t('manual.title')}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    {t('manual.description')}
                </p>
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
                                {t('game.group')} {groupIndex + 1}
                            </h5>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                <span className="badge badge-primary">
                                    {group.players.length} {t('common.players')}
                                </span>
                                {groups.length > 1 && (
                                    <button
                                        onClick={() => removeGroup(groupIndex)}
                                        className="btn btn-secondary btn-sm"
                                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                            {group.players.map((player) => (
                                <div
                                    key={player.id}
                                    style={{
                                        padding: 'var(--spacing-sm)',
                                        background: 'var(--color-bg-tertiary)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ fontSize: '0.875rem' }}>{player.name}</span>
                                    <button
                                        onClick={() => removePlayerFromGroup(groupIndex, player.id)}
                                        className="btn btn-secondary btn-sm"
                                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        {unassignedPlayers.length > 0 && (
                            <select
                                onChange={(e) => {
                                    const player = presentPlayers.find(p => p.id === e.target.value);
                                    if (player) {
                                        addPlayerToGroup(groupIndex, player);
                                        e.target.value = '';
                                    }
                                }}
                                className="input"
                                style={{ fontSize: '0.875rem' }}
                                defaultValue=""
                            >
                                <option value="" disabled>{t('manual.addPlayer')}</option>
                                {unassignedPlayers.map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                ))}

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                        onClick={addGroup}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                    >
                        {t('manual.addGroup')}
                    </button>
                    <button
                        onClick={() => {
                            // Filter out empty groups before saving
                            const validGroups = groups.filter(g => g.players.length > 0);
                            onGroupsCreated(validGroups);
                        }}
                        className="btn btn-primary"
                        disabled={!canSave}
                        style={{ flex: 2 }}
                    >
                        {t('manual.saveGroups')}
                    </button>
                </div>

                {!canSave && (
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        background: 'var(--color-accent-warning)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        {unassignedPlayers.length > 0 && (
                            <div>{`⚠️ ${unassignedPlayers.length} ${t('manual.unassigned')}`}</div>
                        )}
                        {validGroups.some(g => g.players.length < 2) && (
                            <div>{t('manual.minPlayers')}</div>
                        )}
                        {hasDuplicates && (
                            <div>{`⚠️ ${t('manual.duplicates')}`}</div>
                        )}
                        {invalidPlayers.length > 0 && (
                            <div>{`⚠️ ${invalidPlayers.length} ${t('manual.playersNotPresent')}`}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
