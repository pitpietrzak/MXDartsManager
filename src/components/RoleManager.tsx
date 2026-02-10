import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserWithRole {
    id: string;
    email: string;
    role: 'admin' | 'game_manager' | 'user';
}

export function RoleManager() {
    const { role: currentUserRole } = useAuth();
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (currentUserRole === 'admin') {
            loadUsers();
        }
    }, [currentUserRole]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get all user roles (admins can see all via RLS policy)
            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role, email')
                .order('created_at', { ascending: true });

            if (rolesError) throw rolesError;

            const usersWithRoles: UserWithRole[] = (rolesData || []).map(roleData => ({
                id: roleData.user_id,
                email: roleData.email || 'Unknown',
                role: roleData.role as 'admin' | 'game_manager' | 'user'
            }));

            setUsers(usersWithRoles);
        } catch (err) {
            console.error('Error loading users:', err);
            setError('Failed to load users. Make sure you have admin permissions.');
        } finally {
            setLoading(false);
        }
    };

    const updateRole = async (userId: string, newRole: 'admin' | 'game_manager' | 'user') => {
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('user_id', userId);

            if (error) throw error;

            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error('Error updating role:', err);
            alert('Failed to update role');
        }
    };

    if (currentUserRole !== 'admin') {
        return null;
    }

    if (loading) {
        return (
            <div className="card">
                <h2>Role Management</h2>
                <p className="text-muted">Loading users...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card">
                <h2>Role Management</h2>
                <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-error-bg)',
                    color: 'var(--color-error)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    {error}
                </div>
                <button onClick={loadUsers} className="btn btn-secondary" style={{ marginTop: 'var(--spacing-md)' }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h2 style={{ margin: 0 }}>Role Management</h2>
                <button onClick={loadUsers} className="btn btn-secondary btn-sm">
                    🔄 Refresh
                </button>
            </div>

            {users.length === 0 ? (
                <p className="text-muted">No users found</p>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {users.map(user => (
                        <div
                            key={user.id}
                            style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 'var(--spacing-md)'
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{user.email}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
                                    ID: {user.id.slice(0, 8)}...
                                </div>
                            </div>

                            <select
                                value={user.role}
                                onChange={(e) => updateRole(user.id, e.target.value as 'admin' | 'game_manager' | 'user')}
                                style={{
                                    padding: 'var(--spacing-sm)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg-primary)',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '0.875rem',
                                    minWidth: '150px'
                                }}
                            >
                                <option value="user">👤 User</option>
                                <option value="game_manager">🎮 Game Manager</option>
                                <option value="admin">👑 Admin</option>
                            </select>
                        </div>
                    ))}
                </div>
            )}

            <div style={{
                marginTop: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem'
            }}>
                <strong>Role Permissions:</strong>
                <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)' }}>
                    <li><strong>👑 Admin:</strong> Full access - manage players, assign roles, run games</li>
                    <li><strong>🎮 Game Manager:</strong> Can start games, draw groups, submit results</li>
                    <li><strong>👤 User:</strong> View-only access to history and leaderboard</li>
                </ul>
            </div>
        </div>
    );
}
