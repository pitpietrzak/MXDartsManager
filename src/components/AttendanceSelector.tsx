import React, { useState } from 'react';
import { Player } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';

interface AttendanceSelectorProps {
    players: Player[];
    selectedPlayerIds: string[];
    onSelectionChange: (playerIds: string[]) => void;
    playersWhoPlayedToday: Set<string>;
    activePlayerIds: Set<string>;
    selectedDate: string;
}

export const AttendanceSelector: React.FC<AttendanceSelectorProps> = ({
    players,
    selectedPlayerIds,
    onSelectionChange,
    playersWhoPlayedToday,
    activePlayerIds,
    selectedDate
}) => {
    const { t } = useLanguage();
    const selectionSet = new Set(selectedPlayerIds);

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const [activeExpanded, setActiveExpanded] = useState(true);
    const [inactiveExpanded, setInactiveExpanded] = useState(true);

    const togglePlayer = (playerId: string) => {
        if (playersWhoPlayedToday.has(playerId)) {
            return;
        }

        const player = players.find(p => p.id === playerId);
        if (isToday && player && player.isPlayingToday === false) {
            return;
        }

        const newSelection = new Set(selectionSet);
        if (newSelection.has(playerId)) {
            newSelection.delete(playerId);
        } else {
            newSelection.add(playerId);
        }
        onSelectionChange(Array.from(newSelection));
    };

    const selectAll = () => {
        const availableIds = players
            .filter(p => !playersWhoPlayedToday.has(p.id) && (!isToday || p.isPlayingToday !== false))
            .map(p => p.id);
        onSelectionChange(availableIds);
    };

    const selectRecent = () => {
        const availableRecentIds = players
            .filter(p => activePlayerIds.has(p.id) && !playersWhoPlayedToday.has(p.id) && (!isToday || p.isPlayingToday !== false))
            .map(p => p.id);
        onSelectionChange(availableRecentIds);
    };

    const selectNone = () => {
        onSelectionChange([]);
    };

    const availablePlayers = players.filter(p => !playersWhoPlayedToday.has(p.id) && (!isToday || p.isPlayingToday !== false));

    // Split players into active and inactive sections
    const activePlayers = players.filter(p => activePlayerIds.has(p.id));
    const inactivePlayers = players.filter(p => !activePlayerIds.has(p.id));

    const renderPlayer = (player: Player) => {
        const hasPlayedToday = playersWhoPlayedToday.has(player.id);
        const isSelected = selectionSet.has(player.id);
        const isDisabled = hasPlayedToday || (isToday && player.isPlayingToday === false);

        return (
            <label
                key={player.id}
                className="checkbox-wrapper"
                style={{
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    position: 'relative'
                }}
            >
                <input
                    type="checkbox"
                    className="checkbox"
                    checked={isSelected}
                    onChange={() => togglePlayer(player.id)}
                    disabled={isDisabled}
                />
                <span style={{ fontWeight: 500, flex: 1 }}>{player.name} {player.emoji}</span>
                {hasPlayedToday && (
                    <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                        ✅ {t('attendance.alreadyPlayed')}
                    </span>
                )}
                {isToday && player.isPlayingToday === false && (
                    <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                        ❌ {t('profile.notPlayingToday')}
                    </span>
                )}
            </label>
        );
    };

    const renderSection = (
        title: string,
        sectionPlayers: Player[],
        expanded: boolean,
        onToggle: () => void
    ) => {
        if (sectionPlayers.length === 0) return null;

        const sectionSelectedCount = sectionPlayers.filter(p => selectionSet.has(p.id)).length;

        return (
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <button
                    onClick={onToggle}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        cursor: 'pointer',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        marginBottom: expanded ? 'var(--spacing-sm)' : 0,
                        transition: 'all 0.2s ease'
                    }}
                >
                    <span>{title}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                            {sectionSelectedCount}/{sectionPlayers.length}
                        </span>
                        <span style={{
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s ease',
                            fontSize: '0.8rem'
                        }}>
                            ▼
                        </span>
                    </span>
                </button>
                {expanded && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                        {sectionPlayers.map(renderPlayer)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="card fade-in">
            <div className="card-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="card-title" style={{ marginBottom: 'var(--spacing-xs)' }}>
                            {t('attendance.title')}
                        </h3>
                        <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                            {t('attendance.description')}
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', alignItems: 'flex-end' }}>
                        <div className="badge badge-primary" style={{ fontSize: '1rem', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                            {selectionSet.size} {t('attendance.selected')}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {availablePlayers.length} / {players.length} {t('attendance.available')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-sm mb-md">
                <button onClick={selectAll} className="btn btn-secondary btn-sm">
                    {t('attendance.selectAll')}
                </button>
                <button onClick={selectRecent} className="btn btn-secondary btn-sm">
                    {t('attendance.selectRecent')}
                </button>
                <button onClick={selectNone} className="btn btn-secondary btn-sm">
                    {t('attendance.clearAll')}
                </button>
            </div>

            {players.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    {t('attendance.noPlayers')}
                </p>
            ) : (
                <div>
                    {renderSection(
                        t('attendance.recentlyActive'),
                        activePlayers,
                        activeExpanded,
                        () => setActiveExpanded(prev => !prev)
                    )}
                    {renderSection(
                        t('attendance.lessActive'),
                        inactivePlayers,
                        inactiveExpanded,
                        () => setInactiveExpanded(prev => !prev)
                    )}
                </div>
            )}

            {selectionSet.size > 0 && selectionSet.size < 2 && (
                <p style={{ color: 'var(--color-accent-danger)', fontSize: '0.875rem', marginTop: 'var(--spacing-md)' }}>
                    {t('attendance.minPlayers')}
                </p>
            )}
        </div>
    );
};
