import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signIn, signUp } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = isSignUp
                ? await signUp(email, password)
                : await signIn(email, password);

            if (error) {
                setError(error.message);
            } else if (isSignUp) {
                setError('Account created! Please check your email to confirm (or login if email confirmation is disabled).');
                setIsSignUp(false);
            }
        } catch (err) {
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
                            Macrix Darts
                        </span>
                    </h1>
                    <p className="text-muted">
                        {isSignUp ? 'Create your account' : 'Sign in to continue'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
                            Email
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

                    <div>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
                            Password
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

                    {error && (
                        <div style={{
                            padding: 'var(--spacing-sm)',
                            borderRadius: 'var(--radius-md)',
                            background: error.includes('created') ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                            color: error.includes('created') ? 'var(--color-success)' : 'var(--color-error)',
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
                        {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                        }}
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                    >
                        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                    </button>
                </form>
            </div>
        </div>
    );
}
