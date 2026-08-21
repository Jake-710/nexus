import React, { useState } from 'react';
import { useAuth } from '../App';
import { useApi } from '../hooks/useApi';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { post } = useApi();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await post('/auth/login', { username, password });
      login(res.access_token);
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #00d4ff22, transparent 40%), radial-gradient(circle at bottom left, #a855f722, transparent 40%), var(--bg-primary)',
      padding: '2rem'
    }}>
      <div className="card animate-slide-down" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div className="text-center mb-8">
          <div style={{ fontSize: '3rem', marginBottom: '1rem', textShadow: '0 0 20px var(--accent-cyan)' }}>🛡️</div>
          <h1 className="text-2xl font-bold tracking-wider mb-2">UEBA SOC</h1>
          <p className="text-muted">Enter your credentials to access the dashboard</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded" style={{ background: 'rgba(255, 71, 87, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(255,71,87,0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Username</label>
            <input 
              type="text" 
              className="input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Password</label>
            <input 
              type="password" 
              className="input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4" 
            style={{ padding: '0.8rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
