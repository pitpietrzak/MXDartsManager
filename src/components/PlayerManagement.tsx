import React, { useState } from 'react';
import { Player } from '../types/types';

interface PlayerManagementProps {
    players: Player[];
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
    players,
    onAddPlayer,
    onRemovePlayer
}) => {
    const [newPlayerName, setNewPlayerName] = useState('');
    const [error, setError] = useState('');

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

    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">Player Management</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                    Add or remove players from the roster
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mb-lg">
                <div className="flex gap-md">
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter player name..."
                        value={newPlayerName}
                        onChange={(e) => {
                            setNewPlayerName(e.target.value);
                            setError('');
                        }}
                    />
                    <button type="submit" className="btn btn-primary">
                        Add Player
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
                    All Players ({players.length})
                </h4>
                {players.length === 0 ? (
                    <p className="text-muted text-center" style={{ padding: 'var(--spacing-xl)' }}>
                        No players yet. Add your first player above!
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className="flex items-center justify-between"
                                style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    transition: 'all var(--transition-base)'
                                }}
                            >
                                <span style={{ fontWeight: 500 }}>{player.name}</span>
                                <button
                                    onClick={() => onRemovePlayer(player.id)}
                                    className="btn btn-danger btn-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
