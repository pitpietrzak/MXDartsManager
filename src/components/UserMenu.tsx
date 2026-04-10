import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Player } from '../types/types';
import { LanguageSwitcher } from './LanguageSwitcher';

interface UserMenuProps {
    userPlayer?: Player | null;
    onNavigateToProfile?: () => void;
}

export function UserMenu({ userPlayer, onNavigateToProfile }: UserMenuProps) {
    const { user, role, signOut } = useAuth();
    const { t } = useLanguage();

    if (!user) return null;

    const getRoleBadge = () => {
        switch (role) {
            case 'admin':
                return { emoji: '🛠️', label: t('role.admin'), color: 'var(--color-accent-primary)' };
            case 'game_manager':
                return { emoji: '🎯', label: t('role.gameManager'), color: 'var(--color-accent-secondary)' };
            case 'chef':
                return { emoji: '👨‍🍳', label: t('role.chef'), color: 'var(--color-accent-secondary)' };
            default:
                return { emoji: '👤', label: t('role.user'), color: 'var(--color-text-muted)' };
        }
    };

    const badge = getRoleBadge();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: '1.25rem' }}>{badge.emoji}</span>
                <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '2px' }}>
                        {t('common.hello')}, {user.user_metadata?.display_name || userPlayer?.name || user.email?.split('@')[0] || 'User'}!
                    </div>
                    <div style={{ fontSize: '0.75rem', color: badge.color }}>
                        {badge.label}
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                {onNavigateToProfile && (
                    <button
                        onClick={onNavigateToProfile}
                        className="btn btn-secondary btn-sm"
                        title="View your profile"
                    >
                        {t('nav.profile')}
                    </button>
                )}
                <LanguageSwitcher />
                <button
                    onClick={signOut}
                    className="btn btn-secondary btn-sm"
                >
                    🚪 {t('auth.signOut')}
                </button>
            </div>
        </div>
    );
}
