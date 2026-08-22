import React, { useState } from 'react';
import { useAuth } from '../App';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Login failed');
      }
      const data = await res.json();
      login(data.access_token);
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-page)', padding: '2rem',
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '380px', padding: '2.5rem' }}>
        <div className="text-center mb-8">
          <div style={{
            width: '48px', height: '48px', borderRadius: '8px',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: '800', fontSize: '1rem',
            margin: '0 auto 1rem',
          }}>
            UB
          </div>
          <h1 className="text-xl font-bold mb-1">UEBA SOC</h1>
          <p className="text-muted text-sm">Enter your credentials to access the dashboard</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded" style={{ background: '#FF474718', color: 'var(--severity-critical)', border: '1px solid #FF474730', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Username</label>
            <input type="text" className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2" style={{ padding: '0.7rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
