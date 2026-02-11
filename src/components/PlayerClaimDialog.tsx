import React, { useState } from 'react';
import { Player } from '../types/types';
import { useLanguage } from '../contexts/LanguageContext';

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
    const { t } = useLanguage();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

    const handleClaim = () => {
        if (selectedPlayerId) {
            onClaim(selectedPlayerId);
        }
    };

    // Filter out players that are already claimed (have user_id)
    const availablePlayers = players.filter(p => !p.userId);

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
                        👤 {isAdmin ? t('claim.adminTitle') : t('claim.title')}
                    </h3>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {isAdmin ? (
                        <>
                            <p className="text-muted">
                                {t('claim.adminDescription')}
                            </p>

                            {availablePlayers.length > 0 ? (
                                <>
                                    <div>
                                        <label htmlFor="playerSelect" style={{
                                            display: 'block',
                                            marginBottom: 'var(--spacing-xs)',
                                            fontWeight: 600
                                        }}>
                                            {t('claim.select')}
                                        </label>
                                        <select
                                            id="playerSelect"
                                            className="input"
                                            value={selectedPlayerId}
                                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">{t('claim.choose')}</option>
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
                                            {t('claim.skip')}
                                        </button>
                                        <button
                                            onClick={handleClaim}
                                            className="btn btn-primary"
                                            disabled={!selectedPlayerId}
                                        >
                                            {t('claim.button')}
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
                                            ⚠️ {t('claim.noPlayers')}
                                        </p>
                                        <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: '0.875rem' }}>
                                            {t('claim.allClaimed')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="btn btn-secondary"
                                        style={{ width: '100%' }}
                                    >
                                        {t('common.close')}
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-muted">
                                {t('claim.description')}
                            </p>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-accent-primary)',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center'
                            }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>
                                    📧 {t('claim.contactAdmin')}
                                </p>
                                <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: '0.875rem' }}>
                                    {t('claim.contactAdminDesc')}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                            >
                                {t('common.close')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
