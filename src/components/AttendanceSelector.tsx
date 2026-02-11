import React from 'react';
import { Player } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';

interface AttendanceSelectorProps {
    players: Player[];
    selectedPlayerIds: string[];
    onSelectionChange: (playerIds: string[]) => void;
    playersWhoPlayedToday: Set<string>;
}

export const AttendanceSelector: React.FC<AttendanceSelectorProps> = ({
    players,
    selectedPlayerIds,
    onSelectionChange,
    playersWhoPlayedToday
}) => {
    const { t } = useLanguage();
    const selectionSet = new Set(selectedPlayerIds);
    // Remove useEffect as we use props directly

    const togglePlayer = (playerId: string) => {
        // Don't allow toggling players who already played today or are marked as not playing
        if (playersWhoPlayedToday.has(playerId)) {
            return;
        }

        const player = players.find(p => p.id === playerId);
        if (player && player.isPlayingToday === false) {
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
        // Only select players who haven't played today and are playing today
        const availableIds = players
            .filter(p => !playersWhoPlayedToday.has(p.id) && p.isPlayingToday !== false)
            .map(p => p.id);
        onSelectionChange(availableIds);
    };

    const selectNone = () => {
        onSelectionChange([]);
    };

    const availablePlayers = players.filter(p => !playersWhoPlayedToday.has(p.id) && p.isPlayingToday !== false);

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
                <button onClick={selectNone} className="btn btn-secondary btn-sm">
                    {t('attendance.clearAll')}
                </button>
            </div>

            {players.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    {t('attendance.noPlayers')}
                </p>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                    {players.map((player) => {
                        const hasPlayedToday = playersWhoPlayedToday.has(player.id);
                        const isSelected = selectionSet.has(player.id);
                        const isDisabled = hasPlayedToday || player.isPlayingToday === false;

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
                                <span style={{ fontWeight: 500, flex: 1 }}>{player.name}</span>
                                {hasPlayedToday && (
                                    <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                                        ✅ {t('attendance.alreadyPlayed')}
                                    </span>
                                )}
                                {player.isPlayingToday === false && (
                                    <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                                        ❌ {t('profile.notPlayingToday')}
                                    </span>
                                )}
                            </label>
                        );
                    })}
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
