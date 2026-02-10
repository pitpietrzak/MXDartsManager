import { useAuth } from '../contexts/AuthContext';

export function UserMenu() {
    const { user, role, signOut } = useAuth();

    if (!user) return null;

    const getRoleBadge = () => {
        switch (role) {
            case 'admin':
                return { emoji: '👑', label: 'Admin', color: 'var(--color-accent-primary)' };
            case 'game_manager':
                return { emoji: '🎮', label: 'Game Manager', color: 'var(--color-accent-secondary)' };
            default:
                return { emoji: '👤', label: 'User', color: 'var(--color-text-muted)' };
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
                        Hello, {user.email?.split('@')[0] || 'User'}!
                    </div>
                    <div style={{ fontSize: '0.75rem', color: badge.color }}>
                        {badge.label}
                    </div>
                </div>
            </div>
            <button
                onClick={signOut}
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 'var(--spacing-sm)' }}
            >
                Sign Out
            </button>
        </div>
    );
}
