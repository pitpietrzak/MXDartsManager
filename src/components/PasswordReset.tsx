import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export function PasswordReset() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const { updatePassword } = useAuth();
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError(t('auth.passwordsDoNotMatch') || 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { error } = await updatePassword(password);
            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                // Clear form
                setPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            console.error('Password update error:', err);
            setError('Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--color-bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-lg)'
            }}>
                <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>✅</div>
                    <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Password Updated!</h2>
                    <p className="text-muted" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        Your password has been successfully updated. You can now use your new password to log in.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-lg)'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>🔐</div>
                    <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>Update Password</h2>
                    <p className="text-muted">Enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label htmlFor="new-password" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
                            New Password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={6}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
                            Confirm New Password
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={6}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: 'var(--spacing-sm)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-error-bg)',
                            color: 'var(--color-error)',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                    >
                        {loading ? t('common.loading') : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
