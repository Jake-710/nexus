import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getSeverity, getInitials, formatDateTime } from '../theme';

const LS_KEY = 'ueba-notifications-last-viewed';

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const NotificationBell = () => {
  const { get } = useApi();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [lastViewed, setLastViewed] = useState(() => localStorage.getItem(LS_KEY) || '1970-01-01T00:00:00Z');
  const wrapRef = useRef(null);

  const fetchNotifications = useCallback(() => {
    get('/alerts/notifications')
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => { /* silent — bell just stays empty */ });
  }, [get]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unreadCount = items.filter((i) => new Date(i.created_at) > new Date(lastViewed)).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = new Date().toISOString();
      localStorage.setItem(LS_KEY, now);
      setLastViewed(now);
    }
  };

  const goTo = (id) => {
    setOpen(false);
    navigate(`/alerts/${id}`);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <button
        className="btn btn-ghost w-full"
        onClick={toggle}
        style={{ justifyContent: 'flex-start', gap: '0.75rem', padding: '0.5rem 0.85rem', position: 'relative' }}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <BellIcon />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute', top: '-6px', right: '-8px',
                background: 'var(--severity-critical)', color: '#fff',
                fontSize: '0.6rem', fontWeight: 700, lineHeight: 1,
                minWidth: '16px', height: '16px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <span>Notifications</span>
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
            width: '320px', maxHeight: '380px', overflowY: 'auto',
            padding: 0, zIndex: 50, boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
          }}
        >
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem' }}>
            Recent High-Risk Alerts
          </div>
          {items.length === 0 ? (
            <div className="text-secondary text-sm" style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
              No recent high-risk alerts.
            </div>
          ) : (
            items.map((n) => {
              const sev = getSeverity(n.risk_score);
              return (
                <div
                  key={n.id}
                  onClick={() => goTo(n.id)}
                  style={{
                    display: 'flex', gap: '0.75rem', alignItems: 'center',
                    padding: '0.7rem 1rem', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', borderLeft: `3px solid ${sev.color}`,
                  }}
                >
                  <div
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      background: sev.color + '22', color: sev.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 700,
                    }}
                  >
                    {getInitials(n.user_name)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.user_name}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {n.user_department} · {formatDateTime(n.created_at)}
                    </div>
                  </div>
                  <span className="badge" style={{ background: sev.color + '22', color: sev.color, fontSize: '0.68rem', fontWeight: 700 }}>
                    {Math.round(n.risk_score * 100)}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
