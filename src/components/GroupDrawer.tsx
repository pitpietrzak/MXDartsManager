import React from 'react';
import { Player, Group, DailyGame, MonthlyStats } from '../types/types';
import { generateGroups } from '../utils/groupGenerator';
import { orderPlayersInGroup } from '../utils/groupOrderer';
import { useLanguage } from '../contexts/LanguageContext';

interface GroupDrawerProps {
    presentPlayers: Player[];
    groups: Group[];
    onGroupsGenerated: (groups: Group[]) => void;
    currentUserId?: string;
    previousGamedayGames: DailyGame[];
    stats: MonthlyStats[];
}

export const GroupDrawer: React.FC<GroupDrawerProps> = ({
    presentPlayers,
    groups,
    onGroupsGenerated,
    currentUserId,
    previousGamedayGames,
    stats
}) => {
    const { t } = useLanguage();
    const [numberOfGroups, setNumberOfGroups] = React.useState<number>(1);

    const handleDrawGroups = () => {
        if (presentPlayers.length < 2) {
            return;
        }

        // Order function: sorts players within each group by draw priority
        const orderFn = (groupPlayers: Player[]) =>
            orderPlayersInGroup(groupPlayers, previousGamedayGames, stats);

        const playerGroups = generateGroups(presentPlayers, numberOfGroups, orderFn);
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
            return `${actualGroupCount} ${t('groups.preview')} ${baseSize} ${t('common.players')}`;
        } else {
            return `${remainder} ${t('groups.preview')} ${baseSize + 1}, ${actualGroupCount - remainder} ${t('groups.preview')} ${baseSize}`;
        }
    };

    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">{t('game.drawGroups')}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    {t('groups.description')}
                </p>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
                    {t('groups.count')}
                </label>
                <div className="flex gap-sm">
                    {[1, 2, 3, 4].map((count) => {
                        const isValid = presentPlayers.length / count >= 2;
                        return (
                            <label
                                key={count}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 'var(--spacing-sm)',
                                    background: numberOfGroups === count ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                                    color: numberOfGroups === count ? 'white' : isValid ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: isValid ? 'pointer' : 'not-allowed',
                                    border: '2px solid',
                                    borderColor: numberOfGroups === count ? 'var(--color-accent-primary)' : 'var(--color-border-light)',
                                    transition: 'all 0.2s ease',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    opacity: isValid ? 1 : 0.5
                                }}
                            >
                                <input
                                    type="radio"
                                    name="groupCount"
                                    value={count}
                                    checked={numberOfGroups === count}
                                    onChange={() => {
                                        if (isValid) setNumberOfGroups(count);
                                    }}
                                    disabled={!isValid}
                                    style={{ display: 'none' }}
                                />
                                {count}
                            </label>
                        );
                    })}
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
                {t('game.drawGroups')} ({presentPlayers.length} {t('common.players')})
            </button>

            {!canDraw && (
                <p className="text-muted text-center mt-md">
                    {t('groups.minPlayers')}
                </p>
            )}

            {groups.length > 0 && (
                <div className="mt-lg">
                    <div className="flex items-center justify-between mb-md">
                        <h4 style={{ fontSize: '1rem', margin: 0 }}>{t('groups.generated')}</h4>
                        <button onClick={handleDrawGroups} className="btn btn-secondary btn-sm">
                            {t('groups.redraw')}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        {groups.map((group, groupIndex) => {
                            const isUserGroup = currentUserId ? group.players.some(p => p.id === currentUserId) : false;
                            return (
                                <div
                                    key={group.id}
                                    style={{
                                        padding: 'var(--spacing-md)',
                                        background: isUserGroup ? 'var(--color-accent-success)' : 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: isUserGroup ? '2px solid var(--color-accent-success)' : '2px solid var(--color-border-light)',
                                        color: isUserGroup ? 'white' : 'inherit'
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-sm">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <h5 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: isUserGroup ? 'white' : 'var(--color-accent-primary)' }}>
                                                {t('game.group')} {groupIndex + 1}
                                            </h5>
                                            {isUserGroup && (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    background: 'white',
                                                    color: 'var(--color-accent-success)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontWeight: 600
                                                }}>
                                                    {t('game.yourGroup')}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`badge ${isUserGroup ? '' : 'badge-primary'}`} style={isUserGroup ? { background: 'white', color: 'var(--color-accent-success)' } : {}}>
                                            {group.players.length} {t('common.players')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                        {group.players.map((player, playerIndex) => (
                                            <div
                                                key={player.id}
                                                style={{
                                                    padding: 'var(--spacing-sm)',
                                                    background: isUserGroup ? 'rgba(255, 255, 255, 0.2)' : 'var(--color-bg-tertiary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: '0.875rem',
                                                    fontWeight: player.id === currentUserId ? 700 : 500,
                                                    color: isUserGroup ? 'white' : 'inherit'
                                                }}
                                            >
                                                {playerIndex + 1}. {player.name} {player.emoji}
                                                {player.id === currentUserId && (
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
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
