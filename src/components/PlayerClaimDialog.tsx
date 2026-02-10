import React, { useState } from 'react';
import { Player } from '../types/types';

interface PlayerClaimDialogProps {
    players: Player[];
    onClaim: (playerId: string) => void;
    onClose: () => void;
    isAdmin: boolean;
}

export const PlayerClaimDialog: React.FC<PlayerClaimDialogProps> = ({
    players,
    onClaim,
    onClose,
    isAdmin
}) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

    const handleClaim = () => {
        if (selectedPlayerId) {
            onClaim(selectedPlayerId);
        }
    };

    // Filter out players that are already claimed (have user_id)
    const availablePlayers = players.filter(p => !(p as any).user_id);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{
                maxWidth: '500px',
                width: '90%',
                margin: 'var(--spacing-md)'
            }}>
                <div className="card-header">
                    <h3 className="card-title">
                        👤 {isAdmin ? 'Claim Your Player Profile' : 'Player Profile Required'}
                    </h3>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {isAdmin ? (
                        <>
                            <p className="text-muted">
                                To see your personal statistics and game history, please select your player profile from the list below.
                            </p>

                            {availablePlayers.length > 0 ? (
                                <>
                                    <div>
                                        <label htmlFor="playerSelect" style={{
                                            display: 'block',
                                            marginBottom: 'var(--spacing-xs)',
                                            fontWeight: 600
                                        }}>
                                            Select Your Player:
                                        </label>
                                        <select
                                            id="playerSelect"
                                            className="input"
                                            value={selectedPlayerId}
                                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">-- Choose a player --</option>
                                            {availablePlayers.map(player => (
                                                <option key={player.id} value={player.id}>
                                                    {player.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: 'var(--spacing-sm)',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <button
                                            onClick={onClose}
                                            className="btn btn-secondary"
                                        >
                                            Skip for Now
                                        </button>
                                        <button
                                            onClick={handleClaim}
                                            className="btn btn-primary"
                                            disabled={!selectedPlayerId}
                                        >
                                            Claim Profile
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'var(--color-accent-warning)',
                                        color: 'white',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ margin: 0, fontWeight: 600 }}>
                                            ⚠️ No Available Players
                                        </p>
                                        <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: '0.875rem' }}>
                                            All players are already claimed. Please contact an admin to create a new player for you.
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="btn btn-secondary"
                                        style={{ width: '100%' }}
                                    >
                                        Close
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-muted">
                                To access personalized features like "My Profile", you need to have a player profile linked to your account.
                            </p>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-accent-primary)',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center'
                            }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>
                                    📧 Contact an Admin
                                </p>
                                <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: '0.875rem' }}>
                                    Please ask an administrator to link your account to a player profile.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                            >
                                Close
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
