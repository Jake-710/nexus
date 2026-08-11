import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="sidebar">
      <div className="logo flex items-center gap-2 mb-8" style={{ padding: '0 1rem' }}>
        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
        <h1 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          letterSpacing: '0.1em',
          textShadow: '0 0 10px var(--accent-cyan)',
          color: 'var(--text-primary)'
        }}>UEBA</h1>
      </div>

      <nav className="flex flex-col gap-2" style={{ flexGrow: 1 }}>
        <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span>📊</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/alerts" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span>🔔</span>
          <span>Alerts</span>
        </NavLink>
        <NavLink 
          to="/dashboard" 
          className="nav-item"
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
            setTimeout(() => {
              document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' });
            }, 200);
          }}
        >
          <span>👥</span>
          <span>Users</span>
        </NavLink>
      </nav>

      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-4 mb-4 px-4">
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--accent-purple)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            SA
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>SecOps Admin</div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>SOC Analyst</div>
          </div>
        </div>
        <button className="btn btn-ghost w-full" onClick={logout}>
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
