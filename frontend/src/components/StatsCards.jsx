import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
      <div className="card stat-card" style={{ borderBottom: '3px solid var(--accent-red)' }}>
        <div className="flex items-center gap-2 text-muted">
          <span>🚨</span> <span className="label">Active Alerts</span>
        </div>
        <div className="value text-red">{stats.activeAlerts}</div>
      </div>
      
      <div className="card stat-card" style={{ borderBottom: '3px solid var(--accent-amber)' }}>
        <div className="flex items-center gap-2 text-muted">
          <span>⚠️</span> <span className="label">Avg Risk Score</span>
        </div>
        <div className="value text-amber">{stats.avgRiskScore}</div>
      </div>
      
      <div className="card stat-card" style={{ borderBottom: '3px solid var(--accent-cyan)' }}>
        <div className="flex items-center gap-2 text-muted">
          <span>📈</span> <span className="label">Events Today</span>
        </div>
        <div className="value text-cyan">{stats.eventsToday.toLocaleString()}</div>
      </div>
      
      <div className="card stat-card" style={{ borderBottom: '3px solid var(--accent-purple)' }}>
        <div className="flex items-center gap-2 text-muted">
          <span>👥</span> <span className="label">High Risk Users</span>
        </div>
        <div className="value">{stats.highRiskUsers}</div>
      </div>

      <div className="card stat-card" style={{ borderBottom: '3px solid var(--accent-green)' }}>
        <div className="flex items-center gap-2 text-muted">
          <span>⚙️</span> <span className="label">System Status</span>
        </div>
        <div className="value text-green" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--accent-green)', borderRadius: '50%', marginRight: '8px', boxShadow: '0 0 10px var(--accent-green)' }}></span>
          Online
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
