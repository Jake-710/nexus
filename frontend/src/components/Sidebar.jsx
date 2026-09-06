import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../App';
import { getInitials } from '../theme';
import NotificationBell from './NotificationBell';

/* Minimal SVG icons — no emoji, no external dependency */
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  alerts: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  gear: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

const Sidebar = () => {
  const { logout, role, fullName, username } = useAuth();

  const displayName = fullName || username || 'Unknown User';
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'analyst' ? 'SOC Analyst' : 'User';
  const avatarInitials = getInitials(displayName);

  // Theme: default to system preference, persist in localStorage
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('ueba-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ueba-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div className="sidebar">
      {/* Logo */}
      <div style={{ padding: '0.25rem 0.85rem', marginBottom: '2rem' }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: '32px', height: '32px', borderRadius: '6px',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: '800', fontSize: '0.75rem',
          }}>
            UB
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
            UEBA
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1" style={{ flex: 1 }}>
        <div className="text-muted uppercase text-xs" style={{ padding: '0 0.85rem', marginBottom: '0.5rem', letterSpacing: '0.08em', fontWeight: '600' }}>
          Menu
        </div>
        <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.dashboard}
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/alerts" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.alerts}
          <span>Alerts</span>
        </NavLink>
        <NavLink to="/users" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.users}
          <span>Users</span>
        </NavLink>
        {role === 'admin' && (
          <NavLink to="/admin/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            {icons.gear}
            <span>Admin Settings</span>
          </NavLink>
        )}
      </nav>

      {/* Bottom section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        {/* Notifications */}
        <div className="mb-3">
          <NotificationBell />
        </div>

        {/* Theme toggle */}
        <button
          className="btn btn-ghost w-full mb-3"
          onClick={toggleTheme}
          style={{ justifyContent: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.85rem' }}
        >
          {theme === 'dark' ? icons.sun : icons.moon}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-3" style={{ padding: '0.5rem 0.85rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--accent)' + '18',
            color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '0.8rem',
          }}>
            {avatarInitials}
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{displayName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{roleLabel}</div>
          </div>
        </div>

        <button className="btn btn-ghost w-full" onClick={logout} style={{ justifyContent: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.85rem' }}>
          {icons.logout}
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
