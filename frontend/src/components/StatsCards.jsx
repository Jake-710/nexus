import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { SEVERITY } from '../theme';

const StatsCards = () => {
  const { get } = useApi();
  const [stats, setStats] = useState({
    activeAlerts: 0,
    avgRiskScore: 0,
    eventsToday: 0,
    highRiskUsers: 0
  });

  useEffect(() => {
    const fetchStats = () => {
      get('/alerts/stats')
        .then(data => setStats({
          activeAlerts: data.active_alerts || 0,
          avgRiskScore: data.avg_risk_score?.toFixed(2) || '0.00',
          eventsToday: data.events_today || 0,
          highRiskUsers: data.high_risk_users || 0
        }))
        .catch(err => console.error('Stats fetch failed:', err));
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { label: 'Active Alerts',  value: stats.activeAlerts,  accent: SEVERITY.critical.color, icon: '⚠' },
    { label: 'Avg Risk Score', value: stats.avgRiskScore,   accent: SEVERITY.high.color,     icon: '◈' },
    { label: 'Events Today',   value: stats.eventsToday?.toLocaleString?.() ?? stats.eventsToday, accent: SEVERITY.low.color, icon: '▤' },
    { label: 'High Risk Users',value: stats.highRiskUsers,  accent: SEVERITY.critical.color, icon: '▲' },
    { label: 'System Status',  value: null,                 accent: '#22C55E',               icon: '●' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      {cards.map((c, i) => (
        <div
          key={i}
          className="card stat-card"
          style={{ borderLeft: `3px solid ${c.accent}`, padding: '1.25rem' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: c.accent, fontSize: '0.9rem' }}>{c.icon}</span>
            <span className="label">{c.label}</span>
          </div>
          {c.label === 'System Status' ? (
            <div className="value" style={{ color: c.accent, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block', width: '8px', height: '8px',
                background: c.accent, borderRadius: '50%',
              }}></span>
              Online
            </div>
          ) : (
            <div className="value font-mono" style={{ color: c.accent }}>{c.value}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
