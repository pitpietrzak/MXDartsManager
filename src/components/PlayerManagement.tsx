import React, { useState, useEffect } from 'react';
import { Player } from '../types/types';
import { supabase } from '../lib/supabase';
import { linkPlayerToUser } from '../utils/supabaseStorage';
import { useLanguage } from '../contexts/LanguageContext';

interface PlayerManagementProps {
    players: Player[];
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
}

interface UserRole {
    user_id: string;
    email: string;
    role: string;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
    players,
    onAddPlayer,
    onRemovePlayer
}) => {
    const { t } = useLanguage();
    const [newPlayerName, setNewPlayerName] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState<UserRole[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<{ [playerId: string]: string }>({});

    // Load all users
    useEffect(() => {
        async function loadUsers() {
            const { data, error } = await supabase
                .from('user_roles')
                .select('user_id, email, role')
                .order('email');

            if (!error && data) {
                setUsers(data);
            }
        }
        loadUsers();
    }, []);

    // Load existing player-user associations
    useEffect(() => {
        const associations: { [playerId: string]: string } = {};
        players.forEach(player => {
            const playerWithUser = player as any;
            if (playerWithUser.user_id) {
                associations[player.id] = playerWithUser.user_id;
            }
        });
        setSelectedUserId(associations);
    }, [players]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPlayerName.trim()) {
            setError('Player name cannot be empty');
            return;
        }

        if (players.some(p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase())) {
            setError('Player with this name already exists');
            return;
        }

        onAddPlayer(newPlayerName.trim());
        setNewPlayerName('');
        setError('');
    };

    const handleLinkUser = async (playerId: string, userId: string) => {
        if (!userId) return;

        const success = await linkPlayerToUser(playerId, userId);
        if (success) {
            setSelectedUserId(prev => ({ ...prev, [playerId]: userId }));
            // Reload players to show updated associations
            window.location.reload();
        }
    };

    const handleUnlinkUser = async (playerId: string) => {
        const success = await linkPlayerToUser(playerId, '');
        if (success) {
            setSelectedUserId(prev => {
                const newState = { ...prev };
                delete newState[playerId];
                return newState;
            });
            window.location.reload();
        }
    };

    const getUserEmail = (userId: string) => {
        return users.find(u => u.user_id === userId)?.email || 'Unknown';
    };

    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">{t('players.title')}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    {t('players.description')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mb-lg">
                <div className="flex gap-md">
                    <input
                        type="text"
                        className="input"
                        placeholder={t('players.placeholder')}
                        value={newPlayerName}
                        onChange={(e) => {
                            setNewPlayerName(e.target.value);
                            setError('');
                        }}
                    />
                    <button type="submit" className="btn btn-primary">
                        {t('players.addPlayer')}
                    </button>
                </div>
                {error && (
                    <p style={{ color: 'var(--color-accent-danger)', fontSize: '0.875rem', marginTop: 'var(--spacing-sm)' }}>
                        {error}
                    </p>
                )}
            </form>

            <div>
                <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>
                    {t('players.allPlayers')} ({players.length})
                </h4>
                {players.length === 0 ? (
                    <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                        {t('players.noPlayers')}
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                        {players.map((player) => {
                            const playerWithUser = player as any;
                            const linkedUserId = playerWithUser.user_id;

                            return (
                                <div
                                    key={player.id}
                                    style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        transition: 'all var(--transition-base)'
                                    }}
                                >
                                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
                                        <span style={{ fontWeight: 500, fontSize: '1.1rem' }}>{player.name}</span>
                                        <button
                                            onClick={() => onRemovePlayer(player.id)}
                                            className="btn btn-danger btn-sm"
                                            style={{ minWidth: '80px', justifyContent: 'center' }}
                                        >
                                            {t('common.delete')}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                        {linkedUserId ? (
                                            <>
                                                <div style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-sm)',
                                                    background: 'var(--color-accent-success)',
                                                    color: 'white',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {t('players.linkedTo')} {getUserEmail(linkedUserId)}
                                                </div>
                                                <button
                                                    onClick={() => handleUnlinkUser(player.id)}
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ minWidth: '80px', justifyContent: 'center' }}
                                                >
                                                    {t('players.unlink')}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <select
                                                    className="input"
                                                    style={{ flex: 1 }}
                                                    value={selectedUserId[player.id] || ''}
                                                    onChange={(e) => setSelectedUserId(prev => ({ ...prev, [player.id]: e.target.value }))}
                                                >
                                                    <option value="">{t('players.selectUser')}</option>
                                                    {users
                                                        .filter(user => {
                                                            // Only show users who are not already linked to any player
                                                            const isAlreadyLinked = players.some(p => {
                                                                const pWithUser = p as any;
                                                                return pWithUser.user_id === user.user_id;
                                                            });
                                                            return !isAlreadyLinked;
                                                        })
                                                        .map(user => (
                                                            <option key={user.user_id} value={user.user_id}>
                                                                {user.email} ({user.role})
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                                <button
                                                    onClick={() => handleLinkUser(player.id, selectedUserId[player.id])}
                                                    className="btn btn-primary btn-sm"
                                                    disabled={!selectedUserId[player.id]}
                                                    style={{ minWidth: '80px', justifyContent: 'center' }}
                                                >
                                                    {t('players.link')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
