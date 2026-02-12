import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [isResetPending, setIsResetPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signIn, signUp, resetPassword } = useAuth();
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isResetPending) {
                const { error } = await resetPassword(email);
                if (error) {
                    setError(error.message);
                } else {
                    setError('Check your email for the password reset link.');
                    setIsResetPending(false);
                }
            } else {
                const { error } = isSignUp
                    ? await signUp(email, password)
                    : await signIn(email, password);

                if (error) {
                    setError(error.message);
                } else if (isSignUp) {
                    setError('Account created! Please check your email to confirm (or login if email confirmation is disabled).');
                    setIsSignUp(false);
                }
            }
        } catch (err: unknown) {
            console.error(err);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

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
                    <h1 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>
                        <span>🎯</span>
                        <span style={{
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginLeft: 'var(--spacing-sm)'
                        }}>
                            {t('app.title')}
                        </span>
                    </h1>
                    <p className="text-muted">
                        {isResetPending ? 'Reset your password' : (isSignUp ? t('app.subtitle') : t('app.subtitle'))}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
                            {t('auth.email')}
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="your@email.com"
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

                    {!isResetPending && (
                        <div>
                            <label htmlFor="password" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
                                {t('auth.password')}
                            </label>
                            <input
                                id="password"
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
                            {isSignUp && (
                                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
                                    Minimum 6 characters
                                </p>
                            )}
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: 'var(--spacing-sm)',
                            borderRadius: 'var(--radius-md)',
                            background: error.includes('created') || error.includes('Check your email') ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                            color: error.includes('created') || error.includes('Check your email') ? 'var(--color-success)' : 'var(--color-error)',
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
                        {loading
                            ? t('common.loading')
                            : (isResetPending
                                ? 'Send Reset Link'
                                : (isSignUp ? t('auth.signUpButton') : t('auth.signInButton')))
                        }
                    </button>

                    {!isResetPending && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                            }}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            {isSignUp ? t('auth.haveAccount') : t('auth.needAccount')}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setIsResetPending(!isResetPending);
                            setIsSignUp(false);
                            setError(null);
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            marginTop: 'var(--spacing-xs)'
                        }}
                    >
                        {isResetPending ? 'Back to Login' : 'Forgot Password?'}
                    </button>
                </form>
            </div>
        </div>
    );
}
